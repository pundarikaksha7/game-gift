
    /*
     * Adventure — Step 1: Move and Jump
     * A 2D side-scrolling beat-em-up platformer.
     * This step implements basic player movement, jumping, gravity,
     * ground/platform collision, and a camera that follows the player.
     */
    async function run(mode) {
        const gameWorld = document.getElementById('game-world');
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
        const mobileLandscapeQuery = window.matchMedia('(orientation: landscape) and (max-height: 620px)');
        const updateMobileMode = () => {
            document.body.classList.toggle('mobile-landscape', isTouchDevice && mobileLandscapeQuery.matches);
        };
        updateMobileMode();
        if (mobileLandscapeQuery.addEventListener) mobileLandscapeQuery.addEventListener('change', updateMobileMode);
        else if (mobileLandscapeQuery.addListener) mobileLandscapeQuery.addListener(updateMobileMode);
        window.addEventListener('orientationchange', updateMobileMode);

        const rotateOverlay = document.createElement('div');
        rotateOverlay.className = 'rotate-phone-overlay';
        rotateOverlay.innerHTML = '<div class="rotate-phone-card"><div class="rotate-phone-icon">📱</div><h2 class="rotate-phone-title">Turn it sideways</h2><p class="rotate-phone-copy">Adventure is made for landscape on phones. Rotate your phone for the full arcade controls 🎮</p></div>';
        document.body.appendChild(rotateOverlay);
        const VIEW_W = 960;
        const VIEW_H = 540;
        const WORLD_SCALE = 460 / 1080;
        const viewportWidth = () => canvas.width / WORLD_SCALE;
        const viewportHeight = () => canvas.height / WORLD_SCALE;

        function resizeCanvas() {
            // World coordinates were authored for a portrait arcade screen. Keeping
            // a stable internal resolution prevents the ground at y=1080 from
            // disappearing below a short browser viewport.
            canvas.width = VIEW_W;
            canvas.height = VIEW_H;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const cfg = window.gameConfig;

        // ── Runtime state ──
        const PLAYER_W = 64;
        const PLAYER_H = 96;

        let player = {
            x: cfg.player.startX,
            y: cfg.levels?.[0]?.startY ?? cfg.player.startY,
            vx: 0,
            vy: 0,
            w: PLAYER_W,
            h: PLAYER_H,
            onGround: false,
            facingRight: true,
            animState: 'idle',
            animTime: 0,
            attack: null,
            beamActive: false,
            blueBoost: false,
            health: Number(cfg.player.maxHealth ?? 5),
            hurtTimer: 0,
            damageFlash: 0
        };

        let cameraX = 0;
        let currentLevelIndex = cfg.startLevel || 0;
        let levelComplete = false;
        let levelTransition = null;
        let allLevelsComplete = false;
        let exitUnlocked = false;
        // Long side-scrolling stages give the chase, platforms, and hazards room to breathe.
        // The canvas itself is always the full game surface; this is world width, not a
        // viewport ratio or a rendering limit.
        const BASE_LEVEL_LENGTH = 4400;
        let groundHoles = [];
        let crossingPlatforms = [];
        let groundSegments = [];
        let lastSafeX = 0;
        let fallRespawnTimer = 0;
        let worldTime = 0;
        let screenShakeTimer = 0;
        let screenShakePower = 0;

        function getLevelConfig(index = currentLevelIndex) {
            return cfg.levels[index] || cfg.levels[0];
        }

        function getLevelLength(index = currentLevelIndex) {
            const level = getLevelConfig(index);
            if (level.width) return level.width;
            const globalMultiplier = Number(cfg.level?.lengthMultiplier ?? 1);
            const localMultiplier = Number(level.lengthMultiplier ?? 1);
            const scaledLength = BASE_LEVEL_LENGTH * Math.max(0.6, globalMultiplier) * Math.max(0.6, localMultiplier);
            const routeEnd = Math.max(...(level.platforms || []).map(platform => Number(platform.x) + Number(platform.w ?? 280)), 3200);
            // Never place an exit beyond the final built section of the route.
            return Math.max(3200, Math.min(scaledLength, routeEnd + 460));
        }

        function getEnemyCount() {
            const level = getLevelConfig();
            const fallbackCount = Number(cfg.enemies?.count ?? 6) + currentLevelIndex * 2;
            return Math.max(0, Math.round(Number(level.enemyCount ?? fallbackCount)));
        }

        // Generate safe ground segments once per level attempt. Holes are runtime
        // hazards rather than creator-authored objects, so every restart gets a
        // fresh, client-side layout while the opening and finish remain forgiving.
        function generateGroundHoles() {
            const level = getLevelConfig();
            const levelLength = getLevelLength();
            const groundY = Number(level.groundY ?? 1080);
            // Designed crossings: the second and third exceed a running jump.
            // Each has a reachable approach, a ferry, and a safe landing ledge.
            const holes = (level.holes || []).filter(h => h.x + h.w < levelLength - 400).map(h => ({
                ...h, y: groundY, edgeLeft: 14, edgeRight: 18, cracks: []
            }));
            crossingPlatforms = (level.crossingPlatforms ? holes : []).filter(h => h.w > 400).flatMap((h, i) => [
                { x: h.x - 150, y: groundY - 130, w: 190, h: 24 },
                { x: h.x + 220, y: groundY - 190, w: 210, h: 24,
                  motion: { axis: 'horizontal', amplitude: 150, period: 4.8 - currentLevelIndex * .4, phase: i } },
                { x: h.x + h.w - 90, y: groundY - 120, w: 210, h: 24 }
            ]);
            groundHoles = holes;
            groundSegments = [];
            let segmentStart = -2000;
            for (const hole of groundHoles) {
                if (hole.x - segmentStart > 40) {
                    groundSegments.push({ x: segmentStart, y: groundY, w: hole.x - segmentStart, h: 400, isGround: true });
                }
                segmentStart = hole.x + hole.w;
            }
            if (levelLength + 2600 - segmentStart > 40) {
                groundSegments.push({ x: segmentStart, y: groundY, w: levelLength + 2600 - segmentStart, h: 400, isGround: true });
            }
            lastSafeX = getSafeGroundX(Number(level.startX ?? cfg.player.startX ?? 120), PLAYER_W);
        }

        function findSafeRespawnX(preferredX, entityWidth = PLAYER_W) {
            const safeSegments = groundSegments.filter(segment => segment.w > entityWidth + 64);
            if (!safeSegments.length) return Math.max(24, Math.min(getLevelLength() - entityWidth - 24, preferredX));
            const containing = safeSegments.find(segment => preferredX >= segment.x && preferredX + entityWidth <= segment.x + segment.w);
            if (containing) return Math.max(containing.x + 24, Math.min(containing.x + containing.w - entityWidth - 24, preferredX));
            const segment = safeSegments.slice().sort((a, b) => Math.abs((a.x + a.w / 2) - preferredX) - Math.abs((b.x + b.w / 2) - preferredX))[0];
            return Math.max(segment.x + 24, Math.min(segment.x + segment.w - entityWidth - 24, segment.x + 40));
        }

        function isOverGroundHole(x, width = PLAYER_W) {
            const center = x + width / 2;
            return groundHoles.some(hole => center > hole.x - 8 && center < hole.x + hole.w + 8);
        }

        function holeAhead(x, width, direction, lookAhead = 160) {
            const front = direction > 0 ? x + width : x;
            return groundHoles.find(hole => direction > 0
                ? hole.x >= front - 8 && hole.x <= front + lookAhead
                : hole.x + hole.w <= front + 8 && hole.x + hole.w >= front - lookAhead);
        }

        function handlePlayerFall() {
            if (fallRespawnTimer > 0 || gameOver || levelTransition || allLevelsComplete) return;
            const level = getLevelConfig();
            const preferredX = player.x;
            const fallDamage = Number(cfg.hazards?.fallDamage ?? 1);
            hurtPlayer(fallDamage, player.x - 80);
            player.attack = null;
            player.vx = 0;
            player.vy = 0;
            const respawnX = findSafeRespawnX(lastSafeX || preferredX, PLAYER_W);
            player.x = respawnX;
            player.y = Number(level.groundY ?? 1080) - PLAYER_H - 16;
            player.onGround = true;
            lastSafeX = respawnX;
            fallRespawnTimer = 0.32;
        }

        function getSafeGroundX(preferredX, entityWidth = PLAYER_W) {
            const center = Number(preferredX) + entityWidth / 2;
            const validSegments = groundSegments.filter(segment => segment.w > entityWidth + 48);
            if (!validSegments.length) return Math.max(24, Number(preferredX) || 24);
            const containing = validSegments.find(segment => center >= segment.x + 24 && center <= segment.x + segment.w - 24);
            const segment = containing || validSegments.slice().sort((a, b) => {
                const ac = Math.abs(center - (a.x + a.w / 2));
                const bc = Math.abs(center - (b.x + b.w / 2));
                return ac - bc;
            })[0];
            return Math.max(segment.x + 24, Math.min(segment.x + segment.w - entityWidth - 24, Number(preferredX) || segment.x + 24));
        }

        // Runtime enemy state is intentionally separate from gameConfig. The config
        // supplies tuning values; positions, health, AI timers, and defeat animation
        // belong only to this play session.
        const enemyTypes = cfg.enemyTypes;
        let enemies = [];
        let healthPickups = [];
        let defeatBursts = [];
        let powerups = [];
        let levelDropCount = 0;
        const powerupDefinitions = {
            companion: { name: 'Companion beacon', duration: cfg.mechanics.helperDuration, color: '#ffb5de', description: 'Your companions join the fight' },
            beam: { name: 'Energy core', duration: cfg.mechanics.beamDuration, color: '#75e7ff', description: 'Hold J / K for energy beams' },
            boost: { name: 'Power boost', duration: cfg.mechanics.boostDuration, color: '#37ffb4', description: 'Punch + kick damage ×1.8' }
        };
        const powerupTimers = { companion: 0, beam: 0, boost: 0 };
        let companions = [];
        let powerupMessage = '';
        let powerupMessageTimer = 0;
        let hiddenPhone = null;
        let motorcycleEvent = null;
        let playerDamageFlash = 0;
        let enemySpawned = false;
        let gameOver = false;
        let boss = null;
        let bossDefeated = false;
        let styleChain = 0, styleTimer = 0, lastStyle = '', stageScore = 0;
        let combatPopups = [];
        function registerStyle(style, enemy) {
            styleChain = styleTimer > 0 && style !== lastStyle ? Math.min(5, styleChain + 1) : 1;
            lastStyle = style; styleTimer = 2.5;
            const multiplier = 1 + (styleChain - 1) * .1;
            stageScore += Math.round(20 * multiplier);
            combatPopups.push({x:enemy.x + enemy.w/2, y:enemy.y-35, life:.8, text: style === 'stomp' ? 'BOUNCE!' : styleChain > 1 ? `${styleChain} HIT MIX · ×${multiplier.toFixed(1)}` : 'HIT!'});
            return multiplier;
        }
        function drawCombatPopups() {
            ctx.save();ctx.font='700 19px Inter';ctx.textAlign='center';
            for(const item of combatPopups) {ctx.globalAlpha=Math.min(1,item.life*3);ctx.fillStyle='#ffeba0';ctx.fillText(item.text,item.x-cameraX,item.y-(.8-item.life)*45);}
            ctx.restore();
        }

        function enemyTypeForIndex(index) {
            const types = Object.keys(enemyTypes); return types[index % types.length];
        }

        function spawnEnemies() {
            enemies = [];
            const enemyCfg = cfg.enemies || {};
            const count = Object.keys(enemyTypes).length ? getEnemyCount() : 0;
            const level = getLevelConfig();
            const levelLength = getLevelLength();
            const startX = Math.max(360, Number(level.startX ?? cfg.player.startX ?? 120) + 240);
            const routePlatforms = getPlatforms().filter(platform => !platform.isGround);
            // Guarantee a small random subset of enemies can drop a one-heart refill.
            const dropTargetCount = cfg.mechanics.healthDrops ? Math.min(count, Math.max(1, Math.min(3, Math.floor(count / 3)))) : 0;
            const healthDropIndices = new Set();
            while (healthDropIndices.size < dropTargetCount) {
                healthDropIndices.add(Math.floor(Math.random() * count));
            }
            for (let i = 0; i < count; i++) {
                const type = enemyTypeForIndex(i);
                const spec = enemyTypes[type];
                const progress = count <= 1 ? 0 : i / (count - 1);
                const laneOffset = (i % 2) * 70;
                const rawX = Math.min(levelLength - spec.w - 180, startX + progress * Math.max(520, levelLength - startX - 420) + laneOffset);
                const routeIndex = Math.min(routePlatforms.length - 1, Math.round(progress * (routePlatforms.length - 1)));
                const routePlatform = i % 3 === 0 ? null : routePlatforms[routeIndex];
                const x = routePlatform
                    ? Math.max(routePlatform.x + 12, Math.min(routePlatform.x + routePlatform.w - spec.w - 12, rawX))
                    : getSafeGroundX(rawX, spec.w);
                enemies.push({
                    id: `enemy-${i}-${Math.random().toString(36).slice(2, 7)}`,
                    type,
                    x,
                    spawnX: x,
                    awakened: false,
                    y: routePlatform ? routePlatform.y - (spec.h + 16) : Number(level.groundY ?? cfg.level.groundY) - (spec.h + 16),
                    w: spec.w,
                    h: spec.h,
                    vx: 0,
                    vy: 0,
                    onGround: false,
                    facingRight: false,
                    health: Number(enemyCfg[spec.healthKey] ?? (type === 'small' ? 28 : type === 'medium' ? 52 : 88)),
                    maxHealth: Number(enemyCfg[spec.healthKey] ?? (type === 'small' ? 28 : type === 'medium' ? 52 : 88)),
                    attackTimer: 0.35 + i * 0.12,
                    attackPulse: 0,
                    hurtTimer: 0,
                    flashTimer: 0,
                    defeatTimer: 0,
                    healthDrop: healthDropIndices.has(i),
                    healthDropSpawned: false,
                    jumpCooldown: 0.25 + (i % 3) * 0.2,
                    animTime: i * 0.3,
                    // Larger enemies read terrain better; reckless rookies can still
                    // make a bad call and tumble into a pit.
                    iq: spec.archetype === 'large' ? 0.92 : spec.archetype === 'medium' ? 0.70 : 0.34 + (i % 3) * 0.09,
                    pitTimer: 0
                });
            }
            if (level.boss?.enabled) {
                const end = getLevelLength();
                boss = { vx:0, vy:0, attackTimer:0, attackPulse:0, hurtTimer:0, flashTimer:0, defeatTimer:0, animTime:0, type:level.boss.characterId || Object.keys(enemyTypes)[0], id:'final-boss', boss:true,
                    x: end - 330, y: Number(level.groundY) - 236, w: 140, h: 220,
                    health: level.boss.health, maxHealth: level.boss.health, awakened: false, onGround: true,
                    phase: 'approach', timer: 1, attackNumber: 0, healthDrop: false, support: null };
                enemies.push(boss);
            }
            enemySpawned = true;
        }

        function intersects(a, b) {
            return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        }

        function enemyBodyBox(enemy) {
            return { x: enemy.x + 5, y: enemy.y + 8, w: enemy.w - 10, h: enemy.h + 8 };
        }

        function addDefeatBurst(enemy) {
            defeatBursts.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h * 0.42, time: 0, duration: 0.42, color: enemyTypes[enemy.type].color });
        }

        function damageEnemy(enemy, amount, style = null) {
            if (enemy.defeatTimer > 0 || enemy.hurtTimer > 0) return;
            if (style && cfg.mechanics.combos) amount *= registerStyle(style, enemy);
            enemy.health -= amount * (enemy.boss && enemy.phase !== 'recover' ? getLevelConfig().boss.armor : 1);
            enemy.hurtTimer = 0.12;
            enemy.flashTimer = 0.16;
            if (enemy.health <= 0) {
                enemy.health = 0;
                stageScore += enemy.boss ? 1000 : enemyTypes[enemy.type].archetype === 'large' ? 150 : enemyTypes[enemy.type].archetype === 'medium' ? 100 : 60;
                if (enemy.boss) { bossDefeated = true; exitUnlocked = true; }
                enemy.defeatTimer = 0.42;
                enemy.vx = player.facingRight ? 170 : -170;
                enemy.vy = -230;
                addDefeatBurst(enemy);
                playSound('defeat', 0.62);
                if (!enemy.boss && (getLevelConfig().powerup !== 'none' && levelDropCount < cfg.mechanics.powerupLimit && Math.random() < cfg.mechanics.powerupChance)) {
                    const kind = getLevelConfig().powerup === 'mixed' ? ['companion','beam','boost'][levelDropCount % 3] : getLevelConfig().powerup;
                    dropPowerup(kind, enemy);
                    levelDropCount++;
                }
                if (enemy.healthDrop && !enemy.healthDropSpawned) {
                    const pickupY = enemy.y + enemy.h - 40;
                    healthPickups.push({
                        x: enemy.x + enemy.w / 2 - 20,
                        y: pickupY,
                        baseY: pickupY,
                        w: 40,
                        h: 40,
                        time: 0,
                        id: `health-${enemy.id}`
                    });
                    enemy.healthDropSpawned = true;
                }
            }
        }

        function hurtPlayer(amount, sourceX) {
            if (gameOver || levelTransition || allLevelsComplete || player.hurtTimer > 0 || player.health <= 0) return;
            styleChain = 0; styleTimer = 0; lastStyle = '';
            player.health = Math.max(0, player.health - amount);
            player.hurtTimer = Math.max(0.05, Number(cfg.player.invincibilityDuration ?? 0.85));
            player.damageFlash = 0.24;
            player.vx = player.x < sourceX ? -180 : 180;
            player.vy = -180;
            playSound('hurt', 0.55);

            if (player.health <= 0) {
                player.health = 0;
                player.attack = null;
                player.vx = 0;
                player.vy = 0;
                pendingAttack = null;
                gameOver = true;
                parent.postMessage({type:'game-gift:end', result:'lose'}, location.origin);
            }
        }

        // Punches are quick and close; kicks take longer but reach farther.
        // The hitbox is kept as runtime state so the next enemy step can consume
        // it without changing the attack input or animation system.
        const combatCfg = cfg.combat || {};
        const attackDefinitions = {
            punch: {
                duration: 0.22,
                activeStart: 0.045,
                activeEnd: 0.15,
                range: cfg.mechanics.punchRange,
                height: 34,
                damage: Number(combatCfg.punchDamage ?? 12),
                cooldown: Number(combatCfg.punchCooldown ?? 0.28)
            },
            kick: {
                duration: 0.42,
                activeStart: 0.095,
                activeEnd: 0.30,
                range: cfg.mechanics.kickRange,
                height: 42,
                damage: Number(combatCfg.kickDamage ?? 22),
                cooldown: Number(combatCfg.kickCooldown ?? 0.7)
            },
            beam: {
                duration: 0.34, activeStart: 0.06, activeEnd: 0.27,
                range: cfg.mechanics.beamRange, height: 64, damage: cfg.mechanics.beamDamage, cooldown: 0.55
            }
        };
        const attackCooldowns = { punch: 0, kick: 0, beam: 0 };
        let nextAttackId = 1;

        function startAttack(type) {
            if (player.beamActive && (type === 'punch' || type === 'kick')) type = 'beam';
            const data = attackDefinitions[type];
            if (!data || player.attack || attackCooldowns[type] > 0) return false;
            player.attack = { type, elapsed: 0, hitIds: new Set(), id: nextAttackId++ };
            attackCooldowns[type] = data.cooldown;
            player.vx = 0;
            playSound(type === 'kick' ? 'kick' : 'punch', type === 'kick' ? 0.72 : 0.5);
            screenShakeTimer = type === 'kick' ? 0.10 : 0.055;
            screenShakePower = type === 'kick' ? 7 : 3;
            return true;
        }

        function getAttackHitbox() {
            if (!player.attack) return null;
            const data = attackDefinitions[player.attack.type];
            const progress = Math.max(0, Math.min(1, player.attack.elapsed / data.duration));
            const reach = data.range * (0.45 + progress * 0.55);
            const x = player.facingRight
                ? player.x + player.w - 6
                : player.x + 6 - reach;
            return {
                x,
                y: player.y + (player.attack.type === 'kick' ? 38 : 26),
                w: reach,
                h: data.height,
                damage: data.damage * (player.blueBoost && player.attack.type !== 'beam' ? cfg.mechanics.boostMultiplier : 1),
                active: player.attack.elapsed >= data.activeStart && player.attack.elapsed <= data.activeEnd
            };
        }

        // ── Cached character art ──
        // Load the generated protagonist once at startup; never fetch assets in the game loop.
        const assetCache = {};
        const fallbackAssetUrls = cfg.assets;
        function loadImageAsset(id) {
            const info = (window.lib && typeof window.lib.getAsset === 'function' && window.lib.getAsset(id)) || { url: fallbackAssetUrls[id] };
            if (!info || !info.url) {
                if (window.lib && typeof window.lib.log === 'function') window.lib.log(`Warning: ${id} asset not found; using the vector fallback.`);
                return { image: null, ready: false };
            }
            const image = new Image();
            const result = { image, ready: false };
            image.onload = () => { result.ready = true; };
            image.src = info.url;
            assetCache[id] = image;
            return result;
        }

        const helperImages = Object.fromEntries(cfg.helpers.map(h => [h.id, loadImageAsset(h.id)]));
        const playerAssetState = loadImageAsset('player_character');
        const playerImage = playerAssetState.image;
        let playerImageReady = playerAssetState.ready;
        if (playerImage) playerImage.onload = () => { playerImageReady = true; };

        // Enemy art is loaded once at startup. The small/medium/large variants
        // share one runtime system, while their authored assets keep their silhouettes distinct.
        const enemyImageStates = Object.fromEntries(Object.keys(enemyTypes).map(id => [id, loadImageAsset(id)]));
        const backgroundImageStates = Object.fromEntries(cfg.levels.map(l => [l.id, loadImageAsset(l.id)]));
        const specialImageStates = {
            phone: loadImageAsset('hidden_phone_icon'),
            motorcycle: loadImageAsset('biker_motorcycle')
        };

        const frameCache = new Map();
        for (const c of cfg.characters) for (const url of (c.frames?.length ? c.frames : c.role === 'hero' ? cfg.animation.frames : [])) {
          if (!frameCache.has(url)) {const image=new Image();image.src=url;frameCache.set(url,image);}
        }
        function animatedArt(id, fallback) {
          const c=cfg.characters.find(c=>c.id===id);
          const frames=c?.frames?.length ? c.frames : c?.role==='hero' ? cfg.animation.frames : [];
          if (!frames.length) return fallback;
          const image=frameCache.get(frames[Math.floor(worldTime*cfg.animation.fps)%frames.length]);
          return image?.complete && image.naturalWidth ? {image,ready:true}:fallback;
        }
        // Sound is optional and starts after the first input, satisfying browser
        // autoplay rules while keeping the game playable if audio is unavailable.
        const soundUrls = cfg.sounds;
        let soundEnabled = false;
        let levelMusic = null;
        let motorAudioContext = null;
        let motorOscillator = null;
        let motorGain = null;
        // Reuse a small pool of audio elements instead of allocating a new Audio
        // object for every punch/kick/hit. This reduces GC spikes during combat.
        const soundPools = {};
        const soundPoolIndex = {};
        function getSoundFromPool(name) {
            if (!soundPools[name]) {
                soundPools[name] = Array.from({ length: 4 }, () => {
                    const audio = new Audio(soundUrls[name]);
                    audio.preload = 'auto';
                    return audio;
                });
                soundPoolIndex[name] = 0;
            }
            const pool = soundPools[name];
            const index = soundPoolIndex[name]++ % pool.length;
            return pool[index];
        }
        function playSound(name, volume = 0.55) {
            if (!soundEnabled || !soundUrls[name]) return;
            const audio = getSoundFromPool(name);
            audio.pause();
            try { audio.currentTime = 0; } catch (_) {}
            audio.volume = Math.max(0, Math.min(1, volume * Number(cfg.audio?.sfxVolume ?? 0.65)));
            void audio.play().catch(() => {});
        }
        function enableSound() {
            soundEnabled = true;
            if (!levelMusic && soundUrls.music) {
                levelMusic = new Audio(soundUrls.music);
                levelMusic.loop = true;
                levelMusic.volume = Math.max(0, Math.min(1, Number(cfg.audio?.musicVolume ?? 0.18)));
                void levelMusic.play().catch(() => {});
            }
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!motorAudioContext && AudioContextClass) {
                try { motorAudioContext = new AudioContextClass(); } catch (_) { motorAudioContext = null; }
            }
            if (motorAudioContext?.state === 'suspended') void motorAudioContext.resume();
        }
        function startMotorcycleSound() {
            if (!soundEnabled || !motorAudioContext || motorOscillator) return;
            motorOscillator = motorAudioContext.createOscillator();
            motorGain = motorAudioContext.createGain();
            motorOscillator.type = 'sawtooth';
            motorOscillator.frequency.value = 74;
            motorGain.gain.value = 0.045;
            motorOscillator.connect(motorGain); motorGain.connect(motorAudioContext.destination); motorOscillator.start();
        }
        function stopMotorcycleSound() {
            if (!motorOscillator) return;
            try { motorOscillator.stop(); } catch (_) {}
            motorOscillator.disconnect(); motorOscillator = null; motorGain = null;
        }

        // ── Input state ──
        const keys = {};
        let joystickX = 0; // -1 to 1
        let jumpPressed = false;
        let jumpConsumed = false;
        let airJumpsUsed = 0;
        let pendingAttack = null;

        // Keyboard. J and K queue one attack per press instead of repeating
        // continuously when a key is held down.
        window.addEventListener('keydown', e => {
            enableSound();
            if (gameOver && !e.repeat && (e.code === 'KeyR' || e.code === 'Enter')) {
                e.preventDefault();
                restartLevel();
                return;
            }
            keys[e.code] = true;
            if (!e.repeat && e.code === 'KeyJ') pendingAttack = 'punch';
            if (!e.repeat && e.code === 'KeyK') pendingAttack = 'kick';
        });
        window.addEventListener('pointerdown', enableSound, { once: true });
        window.addEventListener('keyup', e => { keys[e.code] = false; });

        // ── Touch controls ──
        let touchControlsEl = null;
        let joystickKnob = null;
        let joystickBase = null;
        let joystickTouch = null;
        let jumpTouch = null;

        function mobileHaptic(pattern = 12) {
            if (!isTouchDevice || !navigator.vibrate) return;
            try { navigator.vibrate(pattern); } catch (_) {}
        }

        function createTouchControls() {
            touchControlsEl = document.createElement('div');
            touchControlsEl.className = 'touch-controls';
            touchControlsEl.setAttribute('aria-label', 'Touch game controls');

            // Joystick
            const jZone = document.createElement('div');
            jZone.className = 'joystick-zone';
            joystickBase = document.createElement('div');
            joystickBase.className = 'joystick-base';
            joystickKnob = document.createElement('div');
            joystickKnob.className = 'joystick-knob';
            joystickBase.appendChild(joystickKnob);
            jZone.appendChild(joystickBase);

            // Jump
            const jumpBtn = document.createElement('div');
            jumpBtn.className = 'jump-btn';
            jumpBtn.textContent = 'JUMP';

            // Combat buttons are deliberately large and stacked on the right.
            const punchBtn = document.createElement('div');
            punchBtn.className = 'attack-btn punch-btn';
            punchBtn.textContent = 'PUNCH';
            const kickBtn = document.createElement('div');
            kickBtn.className = 'attack-btn kick-btn';
            kickBtn.textContent = 'KICK';

            touchControlsEl.appendChild(jZone);
            touchControlsEl.appendChild(kickBtn);
            touchControlsEl.appendChild(punchBtn);
            touchControlsEl.appendChild(jumpBtn);
            gameWorld.appendChild(touchControlsEl);

            function bindAttackButton(button, type) {
                const press = e => {
                    e.preventDefault();
                    pendingAttack = type;
                    mobileHaptic(type === 'kick' ? 18 : 10);
                    button.classList.add('pressed');
                };
                const release = () => button.classList.remove('pressed');
                button.addEventListener('pointerdown', press, { passive: false });
                button.addEventListener('pointerup', release);
                button.addEventListener('pointercancel', release);
                button.addEventListener('pointerleave', release);
            }
            bindAttackButton(punchBtn, 'punch');
            bindAttackButton(kickBtn, 'kick');

            // Joystick touch handling
            jZone.addEventListener('touchstart', handleJoystickStart, { passive: false });
            jZone.addEventListener('touchmove', handleJoystickMove, { passive: false });
            jZone.addEventListener('touchend', handleJoystickEnd, { passive: false });
            jZone.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

            // Jump touch
            jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); jumpPressed = true; mobileHaptic(9); }, { passive: false });
            jumpBtn.addEventListener('touchend', e => { e.preventDefault(); jumpPressed = false; jumpConsumed = false; }, { passive: false });
            jumpBtn.addEventListener('touchcancel', e => { jumpPressed = false; jumpConsumed = false; }, { passive: false });
        }

        function handleJoystickStart(e) {
            e.preventDefault();
            joystickTouch = e.changedTouches[0].identifier;
            handleJoystickMove(e);
        }

        function handleJoystickMove(e) {
            e.preventDefault();
            for (let t of e.touches) {
                if (t.identifier === joystickTouch) {
                    const rect = joystickBase.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    const dx = t.clientX - cx;
                    const maxR = rect.width / 2 - 16;
                    const clamped = Math.max(-maxR, Math.min(maxR, dx));
                    joystickX = clamped / maxR;
                    joystickKnob.style.transform = `translate(calc(-50% + ${clamped}px), -50%)`;
                }
            }
        }

        function handleJoystickEnd(e) {
            e.preventDefault();
            for (let t of e.changedTouches) {
                if (t.identifier === joystickTouch) {
                    joystickTouch = null;
                    joystickX = 0;
                    joystickKnob.style.transform = 'translate(-50%, -50%)';
                }
            }
        }

        if (mode === 'play') {
            createTouchControls();
        }

        // ── HUD ──
        const hud = document.createElement('div');
        hud.className = 'hud';
        hud.innerHTML = `
            <span class="hud-label">Adventure</span>
            <span class="level-name"></span>
            <span class="health-row"></span>
            <span class="enemy-count"></span>
            <span class="combat-help">A D / ← → Move · Space Jump / Stomp · J Punch · K Kick · P Pause</span>
            <span class="attack-state"></span>
        `;
        hud.querySelector('.hud-label').textContent = cfg.title;
        gameWorld.appendChild(hud);
        const powerupNotice = document.createElement('div');
        powerupNotice.className = 'powerup-notice'; powerupNotice.setAttribute('role', 'status');
        gameWorld.appendChild(powerupNotice);
        const powerupStatus = document.createElement('div'); powerupStatus.className = 'powerup-status';hud.appendChild(powerupStatus);
        const scoreStatus = document.createElement('div'); scoreStatus.className = 'powerup-status'; hud.appendChild(scoreStatus);
        const levelNameEl = hud.querySelector('.level-name');
        const healthRowEl = hud.querySelector('.health-row');
        const enemyCountEl = hud.querySelector('.enemy-count');
        const attackStateEl = hud.querySelector('.attack-state');

        const levelTransitionOverlay = document.createElement('div');
        levelTransitionOverlay.className = 'level-transition-overlay is-hidden';
        levelTransitionOverlay.innerHTML = `
            <div class="stage-card">
                <p class="stage-kicker">STAGE COMPLETE</p>
                <h2 class="stage-title"></h2>
                <p class="stage-copy"></p>
            </div>
        `;
        gameWorld.appendChild(levelTransitionOverlay);
        const transitionTitleEl = levelTransitionOverlay.querySelector('.stage-title');
        const transitionCopyEl = levelTransitionOverlay.querySelector('.stage-copy');

        const completionOverlay = document.createElement('div');
        completionOverlay.className = 'completion-overlay is-hidden';
        completionOverlay.innerHTML = '<div class="stage-card"><h2>Experience complete</h2></div>';
        gameWorld.appendChild(completionOverlay);

        // This overlay is intentionally DOM-based so the restart control remains
        // large, readable, and easy to tap on the fixed 720x1280 game surface.
        const gameOverOverlay = document.createElement('div');
        gameOverOverlay.className = 'game-over-overlay is-hidden';
        gameOverOverlay.innerHTML = `
            <div class="game-over-card" role="dialog" aria-label="Game over">
                <h1 class="game-over-title">Game Over</h1>
                <p class="game-over-copy">You ran out of hearts!<br>Ready for another try?</p>
                <button class="restart-btn" type="button">RESTART LEVEL</button>
            </div>
        `;
        gameWorld.appendChild(gameOverOverlay);
        const restartButton = gameOverOverlay.querySelector('.restart-btn');
        restartButton.addEventListener('pointerdown', e => {
            e.preventDefault();
            restartLevel();
        }, { passive: false });

        let hudUpdatedAt = 0;
        function updateHud() {
            const now = performance.now();
            if (now - hudUpdatedAt < 100) return;
            hudUpdatedAt = now;
            powerupNotice.style.opacity = powerupMessageTimer > 0 ? '1' : '0';
            powerupStatus.textContent = Object.keys(powerupTimers).filter(k => powerupTimers[k]>0).map(k => `${powerupDefinitions[k].name}: ${Math.ceil(powerupTimers[k])}s`).join(' · ');
            scoreStatus.textContent = `Stage score ${stageScore} · ${styleChain > 1 ? `${styleChain} HIT MIX` : 'Mix J / K / stomps for combos'}`;
            const level = getLevelConfig();
            levelNameEl.textContent = `Level ${currentLevelIndex + 1} · ${level.name}`;
            const maxHealth = Math.max(1, Math.round(Number(cfg.player.maxHealth ?? 5)));
            const full = Math.max(0, Math.min(maxHealth, player.health));
            healthRowEl.innerHTML = '';
            for (let i = 0; i < maxHealth; i++) {
                const heart = document.createElement('span');
                heart.className = i < full ? 'heart-full' : 'heart-empty';
                heart.textContent = '♥';
                healthRowEl.appendChild(heart);
            }
            const remaining = enemies.filter(enemy => enemy.defeatTimer <= 0).length;
            enemyCountEl.textContent = boss && boss.awakened && boss.health > 0
                ? `FINAL BOSS · ${getLevelConfig().boss.name} ${Math.ceil(boss.health)}/${boss.maxHealth} · Jump to dodge`
                : exitUnlocked
                ? `Route clear — reach the EXIT →  ·  ${currentLevelIndex + 1}/${cfg.levels.length}`
                : `Reach the exit →  ·  ${remaining} rivals  ·  ${Math.min(100, Math.round(player.x / (getLevelLength() - 180) * 100))}%`;
        }

        if (mode === 'edit') {
            const banner = document.createElement('div');
            banner.className = 'edit-banner';
            banner.textContent = '✏️ Edit Mode';
            gameWorld.appendChild(banner);
        }

        // ── Helper: get platforms ──
        function restartLevel() {
            gameOver = false;
            boss = null; bossDefeated = false;
            styleChain = 0; styleTimer = 0; lastStyle = ''; stageScore = 0; combatPopups = [];
            levelComplete = false;
            levelTransition = null;
            allLevelsComplete = false;
            gameOverOverlay.classList.add('is-hidden');
            levelTransitionOverlay.classList.add('is-hidden');
            completionOverlay.classList.add('is-hidden');
            const level = getLevelConfig();
            generateGroundHoles();
            hiddenPhone = null;
            motorcycleEvent = null;
            stopMotorcycleSound();
            placeHiddenPhone();
            player.x = findSafeRespawnX(Number(level.startX ?? cfg.player.startX ?? 120), PLAYER_W);
            player.y = Number(level.startY ?? (level.groundY - PLAYER_H - 16));
            // Start flush with the actual ground height, avoiding a spawn fall
            // caused by the player's configured legacy startY.
            if (Math.abs(player.y - (Number(level.groundY ?? 1080) - PLAYER_H - 16)) < 120) {
                player.y = Number(level.groundY ?? 1080) - PLAYER_H - 16;
            }
            player.vx = 0;
            player.vy = 0;
            player.onGround = false;
            player.facingRight = true;
            player.animState = 'idle';
            player.animTime = 0;
            player.attack = null;
            player.beamActive = false;
            player.blueBoost = false;
            player.health = Math.max(1, Math.round(Number(cfg.player.maxHealth ?? 5)));
            player.hurtTimer = 0;
            player.damageFlash = 0;
            fallRespawnTimer = 0;
            attackCooldowns.punch = 0;
            attackCooldowns.kick = 0;
            attackCooldowns.beam = 0;
            player.support = null;
            pendingAttack = null;
            jumpPressed = false;
            jumpConsumed = false;
            joystickX = 0;
            Object.keys(keys).forEach(key => { keys[key] = false; });
            defeatBursts = [];
            healthPickups = [];
            powerups = [];
            levelDropCount = 0;
            for (const kind of Object.keys(powerupTimers)) powerupTimers[kind] = 0;
            companions = [];
            powerupMessageTimer = 0;
            enemies = [];
            enemySpawned = false;
            exitUnlocked = false;
            cameraX = 0;
            worldTime = 0;
            spawnEnemies();
            if (cfg.mechanics.helpersAtStart) activatePowerup('companion');
        }

        function getPlatforms(time = worldTime) {
            const level = getLevelConfig();
            const platforms = [...(Array.isArray(level.platforms) ? level.platforms : []), ...crossingPlatforms];
            const fallbackGround = {
                x: -2000,
                y: Number(level.groundY ?? 1080),
                w: getLevelLength() + 2600,
                h: 400,
                isGround: true
            };
            const ground = groundSegments.length ? groundSegments : [fallbackGround];
            return [
                ...ground,
                ...platforms.map((platform, index) => {
                    const motion = platform.motion;
                    const axis = motion?.axis || 'none';
                    const amplitude = Number(motion?.amplitude ?? 0);
                    const period = Math.max(1.4, Number(motion?.period ?? 3.5));
                    const phase = Number(motion?.phase ?? index * 0.9);
                    const wave = Math.sin(time * (Math.PI * 2 / period) + phase);
                    return {
                    x: Number(platform.x) + (axis === 'horizontal' || axis === 'both' ? wave * amplitude : 0),
                    y: Number(platform.y) + (axis === 'vertical' || axis === 'both' ? wave * amplitude : 0),
                    w: Number(platform.w ?? 280),
                    h: Number(platform.h ?? 24),
                    id: `platform-${index}`,
                    isGround: false,
                    moving: axis !== 'none' && amplitude > 0
                    };
                })
            ];
        }

        function beginLevel(index) {
            levelComplete = false;
            levelTransition = null;
            gameOver = false;
            boss = null; bossDefeated = false;
            styleChain = 0; styleTimer = 0; lastStyle = ''; stageScore = 0; combatPopups = [];
            allLevelsComplete = false;
            currentLevelIndex = Math.max(0, Math.min(cfg.levels.length - 1, index));
            const level = getLevelConfig();
            generateGroundHoles();
            hiddenPhone = null;
            motorcycleEvent = null;
            stopMotorcycleSound();
            placeHiddenPhone();
            player.x = findSafeRespawnX(Number(level.startX ?? cfg.player.startX ?? 120), PLAYER_W);
            player.y = Number(level.startY ?? (level.groundY - PLAYER_H - 16));
            // Start flush with the actual ground height, avoiding a spawn fall
            // caused by the player's configured legacy startY.
            if (Math.abs(player.y - (Number(level.groundY ?? 1080) - PLAYER_H - 16)) < 120) {
                player.y = Number(level.groundY ?? 1080) - PLAYER_H - 16;
            }
            player.vx = 0;
            player.vy = 0;
            player.onGround = false;
            player.facingRight = true;
            player.attack = null;
            player.beamActive = false;
            player.blueBoost = false;
            player.health = Math.max(1, Math.round(Number(cfg.player.maxHealth ?? 5)));
            player.hurtTimer = 0;
            player.damageFlash = 0;
            fallRespawnTimer = 0;
            attackCooldowns.punch = 0;
            attackCooldowns.kick = 0;
            attackCooldowns.beam = 0;
            player.support = null;
            pendingAttack = null;
            jumpPressed = false;
            jumpConsumed = false;
            joystickX = 0;
            defeatBursts = [];
            healthPickups = [];
            powerups = [];
            levelDropCount = 0;
            for (const kind of Object.keys(powerupTimers)) powerupTimers[kind] = 0;
            companions = [];
            powerupMessageTimer = 0;
            enemies = [];
            enemySpawned = false;
            exitUnlocked = false;
            cameraX = 0;
            worldTime = 0;
            spawnEnemies();
            if (cfg.mechanics.helpersAtStart) activatePowerup('companion');
        }

        function startLevelTransition() {
            if (levelComplete || levelTransition || allLevelsComplete || gameOver) return;
            levelComplete = true;
            playSound('win');
            parent.postMessage({type:'game-gift:end', result:'win'}, location.origin);
            paused = true;

        }

        function updateLevelTransition(dt) {
            if (!levelTransition) return;
            levelTransition.timer -= dt;
            if (levelTransition.timer > 0) return;
            const nextIndex = levelTransition.nextIndex;
            levelTransition = null;
            levelTransitionOverlay.classList.add('is-hidden');
            if (nextIndex >= cfg.levels.length) {
                allLevelsComplete = true;
                completionOverlay.classList.remove('is-hidden');
                return;
            }
            beginLevel(nextIndex);
        }

        // ── Edit mode: draggable platform ──
        let editDragging = null;
        let editDragOffset = { x: 0, y: 0 };

        if (mode === 'edit') {
            canvas.addEventListener('mousedown', e => {
                const mx = e.offsetX + cameraX;
                const my = e.offsetY;
                // Check platform
                const editLevel = getLevelConfig();
                const editPlatform = editLevel.platforms?.[0] || { x: cfg.level.platformX, y: cfg.level.platformY, w: cfg.level.platformW };
                const px = Number(editPlatform.x);
                const py = Number(editPlatform.y);
                const pw = Number(editPlatform.w);
                if (mx >= px && mx <= px + pw && my >= py - 12 && my <= py + 36) {
                    editDragging = 'platform';
                    editDragOffset.x = mx - px;
                    editDragOffset.y = my - py;
                }
                // Check player start
                const psx = cfg.player.startX;
                const psy = cfg.player.startY;
                if (mx >= psx && mx <= psx + PLAYER_W && my >= psy && my <= psy + PLAYER_H) {
                    editDragging = 'player';
                    editDragOffset.x = mx - psx;
                    editDragOffset.y = my - psy;
                }
            });
            canvas.addEventListener('mousemove', e => {
                if (!editDragging) return;
                const mx = e.offsetX + cameraX;
                const my = e.offsetY;
                if (editDragging === 'platform') {
                    const level = getLevelConfig();
                    if (Array.isArray(level.platforms) && level.platforms[0]) {
                        level.platforms[0].x = Math.round((mx - editDragOffset.x) / 8) * 8;
                        level.platforms[0].y = Math.round((my - editDragOffset.y) / 8) * 8;
                    } else {
                        cfg.level.platformX = Math.round((mx - editDragOffset.x) / 8) * 8;
                        cfg.level.platformY = Math.round((my - editDragOffset.y) / 8) * 8;
                    }
                } else if (editDragging === 'player') {
                    cfg.player.startX = Math.round((mx - editDragOffset.x) / 8) * 8;
                    cfg.player.startY = Math.round((my - editDragOffset.y) / 8) * 8;
                    player.x = cfg.player.startX;
                    player.y = cfg.player.startY;
                }
            });
            canvas.addEventListener('mouseup', () => { editDragging = null; });
            canvas.addEventListener('mouseleave', () => { editDragging = null; });
        }

        


        // ── Drawing ──
        function drawBackground() {
            const level = getLevelConfig();
            const groundScreen = Math.min(viewportHeight(), Number(level.groundY ?? 1080) - cameraY());
            ctx.fillStyle = level.skyColor || '#87CEEB';
            ctx.fillRect(0, 0, viewportWidth(), viewportHeight());

            const state = backgroundImageStates[level.id];
            const image = state && state.image;
            if (state && state.ready && image) {
                    // Fill the entire responsive canvas and tile only horizontally for
                // the long world. No fixed aspect-ratio crop limits the map view.
                const bgW = Math.max(viewportWidth(), 1);
                const bgH = Math.max(viewportHeight(), groundScreen, 1);
                const offset = ((cameraX * 0.36) % bgW + bgW) % bgW;
                const top = 0;
                ctx.globalAlpha = 0.98;
                ctx.drawImage(image, -offset, top, bgW, bgH);
                ctx.drawImage(image, bgW - offset, top, bgW, bgH);
                ctx.globalAlpha = 1;
            } else {
                const night = level.theme === 'midnight';
                const sunset = level.theme === 'sunset';
                const palette = night ? ['#222345','#575486','#74749c','#424d68'] : sunset ? ['#f4ded7','#dec0cb','#c5a8b8','#8d919a'] : ['#dceef0','#bfd7d5','#9fc1b5','#6b9f91'];
                const gradient = ctx.createLinearGradient(0,0,0,groundScreen);
                gradient.addColorStop(0,palette[0]); gradient.addColorStop(1,night?'#43415f':sunset?'#f7e8cb':'#f0f4df');
                ctx.fillStyle = gradient; ctx.fillRect(0,0,viewportWidth(),viewportHeight());
                ctx.fillStyle = night ? '#fff1d1' : '#fff9df';
                ctx.beginPath(); ctx.arc(viewportWidth()*.77,groundScreen*.26,night?60:86,0,Math.PI*2); ctx.fill();
                if(night) { ctx.fillStyle='#e6def6'; for(let i=0;i<40;i++){ctx.globalAlpha=.3+(Math.sin(i+worldTime*.4)+1)*.25;ctx.beginPath();ctx.arc((i*193+45)%viewportWidth(),40+(i*97)%(groundScreen*.62),2+(i%3),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1; }
                for(let layer=0;layer<3;layer++) {
                    ctx.fillStyle=palette[layer+1]; ctx.beginPath(); ctx.moveTo(0,groundScreen);
                    for(let x=0;x<=viewportWidth()+20;x+=20) {
                        const worldX=x+cameraX*(.08+layer*.1);
                        const y=groundScreen*(.56+layer*.13)+Math.sin(worldX/(230-layer*45)+layer)*85+Math.cos(worldX/410)*50;
                        ctx.lineTo(x,y);
                    }
                    ctx.lineTo(viewportWidth()+20,groundScreen);ctx.closePath();ctx.fill();
                }
                for(let i=0;i<10;i++) {
                    const x=i*300-(cameraX*.55%300); const y=groundScreen;
                    ctx.strokeStyle=night?'#435c64':'#4a8177';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-115);ctx.stroke();
                    ctx.fillStyle=night?'#557279':'#6b9c85';ctx.beginPath();ctx.ellipse(x,y-145,48,75,-.15,0,Math.PI*2);ctx.fill();
                }
            }
            ctx.fillStyle = level.theme === 'midnight' ? 'rgba(22,12,36,0.32)' : 'rgba(255,255,255,0.08)';
            ctx.fillRect(0, 0, viewportWidth(), Math.max(0, groundScreen));
        }

        function cameraY() { return 0; }

        function drawPlatforms() {
            const level = getLevelConfig();
            const platforms = getPlatforms();
            const groundPlatforms = platforms.filter(platform => platform.isGround);
            ctx.fillStyle = level.groundColor || '#6B8E23';
            for (const ground of groundPlatforms) {
                ctx.fillRect(ground.x - cameraX, ground.y, ground.w, ground.h);
                ctx.fillStyle = level.theme === 'midnight' ? '#8d4b9e' : level.theme === 'sunset' ? '#8da5b8' : '#5cb85c';
                ctx.fillRect(ground.x - cameraX, ground.y, ground.w, 8);
                ctx.fillStyle = level.groundColor || '#6B8E23';
            }

            for (const hole of groundHoles) {
                const sx = hole.x - cameraX;
                if (sx + hole.w < -40 || sx > viewportWidth() + 40) continue;
                if (hole.w > 400) {
                    ctx.fillStyle = '#ffe0a0'; ctx.font = '700 18px Inter'; ctx.textAlign = 'left';
                    ctx.fillText('RIDE THE LIFT →', sx - 145, hole.y - 160);
                }
                const left = sx;
                const right = sx + hole.w;
                // Irregular edges, a shallow inner rim, and pavement cracks make
                // these read as believable damaged walkway sections rather than
                // giant rectangular cartoon pits.
                ctx.fillStyle = level.theme === 'midnight' ? '#160c2a' : '#111923';
                ctx.beginPath();
                ctx.moveTo(left, hole.y);
                ctx.lineTo(left + hole.edgeLeft, hole.y + 7);
                ctx.lineTo(left + hole.w * 0.32, hole.y + 3);
                ctx.lineTo(left + hole.w * 0.58, hole.y + 9);
                ctx.lineTo(right - hole.edgeRight, hole.y + 4);
                ctx.lineTo(right, hole.y);
                ctx.lineTo(right, viewportHeight() + 80);
                ctx.lineTo(left, viewportHeight() + 80);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = level.theme === 'midnight' ? '#b84b9b' : '#505965';
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(left + 2, hole.y + 1);
                ctx.lineTo(left + hole.edgeLeft, hole.y + 7);
                ctx.lineTo(left + hole.w * 0.32, hole.y + 3);
                ctx.lineTo(left + hole.w * 0.58, hole.y + 9);
                ctx.lineTo(right - hole.edgeRight, hole.y + 4);
                ctx.lineTo(right - 2, hole.y + 1);
                ctx.stroke();

                ctx.strokeStyle = level.theme === 'midnight' ? 'rgba(235,113,210,0.38)' : 'rgba(131,143,153,0.48)';
                ctx.lineWidth = 2;
                for (const crack of hole.cracks || []) {
                    const crackX = left + crack.x;
                    const crackY = hole.y - 2;
                    ctx.beginPath();
                    ctx.moveTo(crackX, crackY);
                    ctx.lineTo(crackX + crack.side * 7, crackY - 7);
                    ctx.lineTo(crackX + crack.side * 13, crackY - 3);
                    ctx.lineTo(crackX + crack.side * crack.length, crackY - 12);
                    ctx.stroke();
                }
            }

            for (const p of platforms.filter(platform => !platform.isGround)) {
                const px = p.x - cameraX;
                // Static platforms are solid elevated floors, not floating props.
                // Their supports make the route read like a stepped building/Mario map.
                if (!p.moving) {
                    const floorY = Number(level.groundY ?? 1080);
                    const supportColor = level.theme === 'midnight' ? '#382344' : level.theme === 'sunset' ? '#40566a' : '#7a431c';
                    ctx.fillStyle = supportColor;
                    ctx.fillRect(px + 18, p.y + p.h, 14, Math.max(0, floorY - p.y - p.h));
                    ctx.fillRect(px + p.w - 32, p.y + p.h, 14, Math.max(0, floorY - p.y - p.h));
                    ctx.fillStyle = 'rgba(255,255,255,.13)';
                    ctx.fillRect(px + 21, p.y + p.h, 3, Math.max(0, floorY - p.y - p.h));
                }
                ctx.fillStyle = level.theme === 'midnight' ? '#5e3979' : level.theme === 'sunset' ? '#58738d' : '#b5651d';
                ctx.fillRect(px, p.y, p.w, p.h);
                ctx.strokeStyle = level.theme === 'midnight' ? '#d95bc5' : level.theme === 'sunset' ? '#b9d5e8' : '#8B4513';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, p.y, p.w, p.h);
                ctx.fillStyle = level.theme === 'midnight' ? '#ff83d2' : level.theme === 'sunset' ? '#d8eef7' : '#cd853f';
                ctx.fillRect(px, p.y, p.w, 5);
                if (p.moving) {
                    ctx.fillStyle = 'rgba(255,244,174,.9)';
                    ctx.font = '700 12px system-ui';
                    ctx.textAlign = 'center';
                    ctx.fillText('⇅', px + p.w / 2, p.y - 8);
                }
                if (mode === 'edit') {
                    ctx.strokeStyle = '#00ff88';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.strokeRect(p.x - cameraX - 4, p.y - 4, p.w + 8, p.h + 8);
                    ctx.setLineDash([]);
                }
            }
        }

        function drawRunDust(x, y, phase, color) {
            const stride = Math.sin(phase);
            ctx.save();
            ctx.globalAlpha = 0.48;
            ctx.fillStyle = color;
            for (let i = 0; i < 2; i++) {
                const puffX = x - stride * 9 - i * 12;
                const puffY = y - Math.abs(stride) * 2 + i * 3;
                ctx.beginPath();
                ctx.arc(puffX, puffY, 4 + i * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - 22 - stride * 5, y + 2);
            ctx.lineTo(x - 8 - stride * 5, y + 2);
            ctx.stroke();
            ctx.restore();
        }

        function drawExitGate() {
            const level = getLevelConfig();
            const x = getLevelLength() - 190 - cameraX;
            const y = Number(level.groundY ?? 1080) - 170;
            if (x < -140 || x > viewportWidth() + 80) return;
            ctx.save();
            ctx.fillStyle = exitUnlocked ? '#63e878' : '#7c617d';
            ctx.fillRect(x + 18, y + 40, 12, 170);
            ctx.fillRect(x + 112, y + 40, 12, 170);
            ctx.fillStyle = exitUnlocked ? '#dfffa5' : '#3c2f47';
            ctx.fillRect(x, y + 20, 142, 30);
            ctx.fillStyle = exitUnlocked ? '#204d36' : '#ddd1bd';
            ctx.font = '700 17px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(currentLevelIndex === 2 && !bossDefeated ? 'BOSS AHEAD' : 'EXIT', x + 71, y + 41);
            if (exitUnlocked) {
                ctx.globalAlpha = 0.35 + Math.sin(worldTime * 5) * 0.15;
                ctx.fillStyle = '#baffcc';
                ctx.fillRect(x + 32, y + 52, 78, 150);
            }
            ctx.restore();
        }

        function drawEnemyFallback(enemy, sx, sy, spec) {
            const cx = sx + enemy.w / 2;
            ctx.save();
            ctx.fillStyle = '#d4a574';
            ctx.beginPath();
            ctx.arc(cx + 2, sy + 18, enemyTypes[enemy.type].archetype === 'large' ? 18 : 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = enemyTypes[enemy.type].archetype === 'small' ? '#e45c52' : enemyTypes[enemy.type].archetype === 'medium' ? '#2a9d8f' : '#563267';
            ctx.fillRect(sx + 7, sy + 30, enemy.w - 14, enemyTypes[enemy.type].archetype === 'large' ? 40 : 30);
            ctx.fillStyle = enemyTypes[enemy.type].archetype === 'large' ? '#3b3542' : '#4b4b62';
            ctx.fillRect(sx + 9, sy + (enemyTypes[enemy.type].archetype === 'large' ? 70 : 60), 13, enemy.h - (enemyTypes[enemy.type].archetype === 'large' ? 70 : 60));
            ctx.fillRect(sx + enemy.w - 22, sy + (enemyTypes[enemy.type].archetype === 'large' ? 70 : 60), 13, enemy.h - (enemyTypes[enemy.type].archetype === 'large' ? 70 : 60));
            ctx.fillStyle = '#20202c';
            ctx.fillRect(sx + enemy.w - 3, sy + enemy.h - 12, 14, 8);
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 10, sy + 14, 4, 4);
            ctx.restore();
        }

        function drawEnemyAttackEffect(enemy, sx, sy) {
            if (enemy.attackPulse <= 0) return;
            const progress = Math.max(0, 1 - enemy.attackPulse / .16);
            const direction = enemy.facingRight ? 1 : -1;
            const isKick = enemyTypes[enemy.type].archetype === 'medium';
            const color = enemyTypes[enemy.type].archetype === 'small' ? '#ff6f91' : enemyTypes[enemy.type].archetype === 'medium' ? '#65e5df' : '#b98cff';
            const glow = enemyTypes[enemy.type].archetype === 'small' ? 'rgba(255,111,145,.42)' : enemyTypes[enemy.type].archetype === 'medium' ? 'rgba(101,229,223,.42)' : 'rgba(185,140,255,.42)';
            const originX = sx + (enemy.facingRight ? enemy.w - 8 : 8);
            const originY = sy + (isKick ? enemy.h - 30 : 39);
            const reach = (isKick ? 58 : 42) * (0.42 + Math.sin(Math.min(1, progress) * Math.PI) * 0.58);
            const tipX = originX + direction * reach;
            const tipY = originY - (isKick ? 13 : 3);
            ctx.save();
            ctx.strokeStyle = glow;
            ctx.lineWidth = isKick ? 11 : 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            if (isKick) ctx.ellipse(tipX, tipY, 17, 9, 0, 0, Math.PI * 2);
            else ctx.arc(tipX, tipY, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff3bf';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(tipX, tipY, isKick ? 20 : 15, direction > 0 ? -0.9 : 2.2, direction > 0 ? 0.7 : 4.0);
            ctx.stroke();
            ctx.restore();
        }

        function drawEnemies() {
            for (const enemy of enemies) {
                if (enemy.defeatTimer <= 0 && enemy.x + enemy.w < cameraX - 100) continue;
                const spec = enemyTypes[enemy.type];
                const sx = enemy.x - cameraX;
                const sy = enemy.y + Math.sin(enemy.animTime * 8) * (enemy.defeatTimer > 0 ? 0 : 1);
                const state = animatedArt(enemy.type, enemyImageStates[enemy.type]);
                const image = state && state.image;
                const defeated = enemy.defeatTimer > 0;
                ctx.save();
                if (!enemy.facingRight) {
                    ctx.translate(sx + enemy.w / 2, 0);
                    ctx.scale(-1, 1);
                    ctx.translate(-(sx + enemy.w / 2), 0);
                }
                if (defeated) {
                    ctx.globalAlpha = Math.max(0, enemy.defeatTimer / 0.42);
                }
                if (enemy.flashTimer > 0) ctx.globalAlpha *= 0.68;
                const running = enemy.defeatTimer <= 0 && enemy.onGround && Math.abs(enemy.vx) > 5;
                const jumping = enemy.defeatTimer <= 0 && !enemy.onGround;
                const runPhase = Math.sin(enemy.animTime * 14 * cfg.animation.speed);
                const motionBob = jumping ? -4 : running ? -Math.abs(runPhase) * 3 : Math.sin(enemy.animTime * 3) * 1.5;
                const motionTilt = defeated ? -.55 * Math.min(1, (.42 - enemy.defeatTimer) / .42) : enemy.boss && enemy.phase.endsWith('windup') ? -.13 : enemy.boss && enemy.phase === 'slam' ? .24 : jumping ? (enemy.vx >= 0 ? 0.06 : -0.06) : running ? runPhase * 0.035 : 0;
                ctx.translate(sx + enemy.w / 2, sy + enemy.h);
                ctx.rotate(motionTilt);
                // Preserve the source aspect ratio during every animation frame.
                ctx.translate(-(sx + enemy.w / 2), -(sy + enemy.h));
                if (state && state.ready && image) {
                    const spriteH = enemy.boss ? 210 : enemy.h;
                    const spriteW = image.naturalWidth && image.naturalHeight ? spriteH * (image.naturalWidth / image.naturalHeight) : enemy.w + 16;
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = isTouchDevice ? 'medium' : 'high';
                    ctx.drawImage(image, sx + enemy.w / 2 - spriteW / 2, sy + enemy.h + 16 - spriteH + motionBob, spriteW, spriteH);
                } else {
                    drawEnemyFallback(enemy, sx, sy + motionBob, spec);
                }
                ctx.restore();
                if (!defeated && running) drawRunDust(sx + enemy.w / 2, sy + enemy.h - 3, runPhase, spec.color);
                if (!defeated) drawEnemyAttackEffect(enemy, sx, sy);

                if (!defeated && cfg.mechanics.healthBars) {
                    ctx.font = '700 16px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
                    ctx.fillText(enemy.boss ? getLevelConfig().boss.name + ' · FINAL BOSS' : spec.name, sx + enemy.w / 2, sy - 23);
                    const barW = Math.max(48, enemy.w + 12);
                    const barX = sx + enemy.w / 2 - barW / 2;
                    const barY = sy - 14;
                    ctx.fillStyle = 'rgba(30,20,30,0.76)';
                    ctx.fillRect(barX, barY, barW, 7);
                    ctx.fillStyle = enemy.health / enemy.maxHealth > 0.5 ? '#65e06f' : '#ffab45';
                    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * Math.max(0, enemy.health / enemy.maxHealth), 5);
                    if (mode === 'edit') {
                        ctx.strokeStyle = '#ffef72';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([4, 3]);
                        ctx.strokeRect(sx - 3, sy - 3, enemy.w + 6, enemy.h + 6);
                        ctx.setLineDash([]);
                    }
                }
            }
        }

        function drawDefeatBursts() {
            for (const burst of defeatBursts) {
                const progress = burst.time / burst.duration;
                const radius = 12 + progress * 28;
                ctx.save();
                ctx.globalAlpha = 1 - progress;
                ctx.strokeStyle = burst.color;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(burst.x - cameraX, burst.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#fff0a5';
                ctx.font = '700 22px Fredoka';
                ctx.fillText('KO!', burst.x - cameraX - 18, burst.y - radius - 5);
                ctx.restore();
            }
        }

        function drawHealthPickups() {
            for (const pickup of healthPickups) {
                const sx = pickup.x - cameraX;
                if (sx + pickup.w < -60 || sx > viewportWidth() + 60) continue;
                const sy = pickup.baseY + Math.sin(pickup.time * 5.5) * 6;
                ctx.save();
                ctx.shadowColor = 'rgba(255, 82, 126, 0.8)';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#ff5f87';
                ctx.font = '700 36px Fredoka';
                ctx.textAlign = 'center';
                ctx.fillText('♥', sx + pickup.w / 2, sy + 31);
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#fff3a6';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(sx + pickup.w / 2, sy + 20, 25, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#fff8d0';
                ctx.font = '700 14px Fredoka';
                ctx.fillText('+1', sx + pickup.w / 2, sy - 8);
                ctx.restore();
            }
        }

        function announcePowerup(message) {
            powerupMessage = message;
            powerupMessageTimer = 4;
            powerupNotice.textContent = message;
        }
        function dropPowerup(kind, enemy) {
            const platform = getPlatforms().filter(p => enemy.x + enemy.w / 2 >= p.x && enemy.x + enemy.w / 2 <= p.x + p.w && p.y >= enemy.y + enemy.h - 8).sort((a,b) => a.y-b.y)[0];
            const x = platform ? Math.max(platform.x, Math.min(platform.x + platform.w - 80, enemy.x)) : findSafeRespawnX(enemy.x, 80);
            powerups.push({ kind, x, y: (platform?.y ?? Number(getLevelConfig().groundY)) - 100, w: 80, h: 84, time: 0 });
            announcePowerup(`${powerupDefinitions[kind].name} dropped · Ready in 1 second`);
        }
        function activatePowerup(kind) {
            if (!powerupDefinitions[kind]) return;
            powerupTimers[kind] = powerupDefinitions[kind].duration;
            if (kind === 'companion' && companions.length === 0) {
                companions = cfg.helpers.map((h,i) => ({...h, x:player.x - 42 - i*44, y:player.y}));
            } else if (kind === 'beam') player.beamActive = true;
            else if (kind === 'boost') player.blueBoost = true;
            const info = powerupDefinitions[kind];
            announcePowerup(`${info.name} · ${info.description} · ${info.duration}s`);
        }
        function updatePowerups(dt) {
            powerupMessageTimer = Math.max(0, powerupMessageTimer - dt);
            for (const kind of Object.keys(powerupTimers)) {
                const wasActive = powerupTimers[kind] > 0;
                powerupTimers[kind] = Math.max(0, powerupTimers[kind] - dt);
                if (wasActive && powerupTimers[kind] === 0) {
                    if (kind === 'companion') companions = [];
                    if (kind === 'beam') player.beamActive = false;
                    if (kind === 'boost') player.blueBoost = false;
                    announcePowerup(`${powerupDefinitions[kind].name} expired`);
                }
            }
            for (const item of powerups) {
                item.time += dt;
                if (item.time >= cfg.mechanics.pickupDelay && intersects(item, player)) { activatePowerup(item.kind); item.collected = true; }
            }
            powerups = powerups.filter(item => !item.collected);
            for (const ally of companions) {
                ally.x += (player.x - (player.facingRight ? 1 : -1) * (ally.size === 'small' ? 76 : 140) - ally.x) * Math.min(1, dt * 5);
                ally.y += (player.y - ally.y) * Math.min(1, dt * 6);
                ally.flash = Math.max(0, (ally.flash || 0) - dt);
                ally.attackTimer = Math.max(0, (ally.attackTimer || 0) - dt);
                const target = enemies.find(enemy => enemy.health > 0 && Math.abs(enemy.x - ally.x) < ally.range && Math.abs(enemy.y - ally.y) < 90);
                if (target && ally.attackTimer <= 0) { ally.target = { x: target.x + target.w / 2, y: target.y + 40 }; ally.flash = .18; damageEnemy(target, ally.damage); ally.attackTimer = ally.cooldown; }
            }
        }
        function drawPowerups() {
            for (const item of powerups) {
                const sx = item.x - cameraX, sy = item.y + Math.sin(item.time * 4) * 7;
                const info = powerupDefinitions[item.kind], ready = item.time >= cfg.mechanics.pickupDelay;
                ctx.save(); ctx.translate(sx + 40, sy + 42); ctx.textAlign = 'center';
                ctx.shadowColor = info.color; ctx.shadowBlur = ready ? 24 : 10;
                ctx.fillStyle = 'rgba(12,22,42,.88)'; ctx.beginPath(); ctx.arc(0, 0, 49, 0, Math.PI*2);ctx.fill();
                ctx.strokeStyle = info.color; ctx.lineWidth = 3;ctx.beginPath();ctx.arc(0,0,49,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,item.time));ctx.stroke();ctx.shadowBlur=0;
                if (item.kind === 'companion') {
                    ctx.font = '58px system-ui'; ctx.fillText('🐈', 0, 20);
                } else if (item.kind === 'beam') {
                    ctx.fillStyle='#faf1cf';ctx.fillRect(-25,-32,51,66);
                    ctx.fillStyle='#164c76';ctx.fillRect(-29,-36,50,66);
                    ctx.fillStyle='#e8bc65';ctx.fillRect(-29,-36,7,66);ctx.fillRect(-17,-26,32,3);
                    ctx.font='700 20px Inter';ctx.fillText('CORE',0,2);ctx.font='8px Inter';ctx.fillText('ENERGY',0,18);
                } else {
                    // A tapered glass with blue-green liquid, a thick base and lime garnish.
                    ctx.fillStyle='rgba(205,249,255,.28)';ctx.strokeStyle='#e5ffff';ctx.lineWidth=3;
                    ctx.beginPath();ctx.moveTo(-23,-28);ctx.lineTo(23,-28);ctx.lineTo(16,31);ctx.lineTo(-16,31);ctx.closePath();ctx.fill();ctx.stroke();
                    ctx.fillStyle='#22d9c4';ctx.beginPath();ctx.moveTo(-19,-9);ctx.lineTo(19,-9);ctx.lineTo(14,24);ctx.lineTo(-14,24);ctx.closePath();ctx.fill();
                    ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(-13,-19);ctx.lineTo(-9,20);ctx.stroke();
                    ctx.fillStyle='#baff65';ctx.beginPath();ctx.arc(19,-27,15,Math.PI,Math.PI*2);ctx.closePath();ctx.fill();
                    ctx.strokeStyle='#59a62d';ctx.lineWidth=3;ctx.stroke();
                }
                ctx.font='700 17px Inter';ctx.fillStyle='#fff';ctx.fillText(info.name,0,-61);
                ctx.font='700 13px Inter';ctx.fillStyle=info.color;ctx.fillText(ready ? `PICK UP · ${info.duration}s` : 'CHARGING…',0,69);
                ctx.restore();
            }
            for (const ally of companions) {
                const sx = ally.x - cameraX, sy = ally.y + 10;
                const color = ally.size === 'big' ? '#a598ff' : '#56e5d3';
                const stride = Math.sin(worldTime * 13) * Math.min(6, Math.abs(player.vx) / 50);
                const art = animatedArt(ally.id, helperImages[ally.id]);
                if (art.ready) {
                    const h = (ally.size === 'big' ? 90 : 82) * ally.scale, w = h * art.image.naturalWidth / art.image.naturalHeight;
                    ctx.save(); ctx.translate(sx + 27, sy + 102);
                    ctx.scale(player.facingRight ? 1 : -1, 1);
                    ctx.rotate(Math.sin(worldTime * 12) * (Math.abs(player.vx) > 5 ? .035 : .008));
                    ctx.drawImage(art.image, -w / 2, -h, w, h); ctx.restore();
                    ctx.fillStyle = color; ctx.font = '700 16px Inter'; ctx.textAlign = 'center'; ctx.fillText(ally.name, sx + 27, sy - 22);
                } else {
                ctx.save(); ctx.translate(sx, sy);
                ctx.fillStyle = '#20243b';
                ctx.beginPath(); ctx.ellipse(27, 94, 29, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#27304d'; ctx.lineWidth = 10; ctx.lineCap = 'round';
                for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(27 + side * 9, 62); ctx.lineTo(27 + side * 12 + stride * side, 90); ctx.stroke(); }
                ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(9, 31, 37, 35, 9); ctx.fill();
                ctx.fillStyle = '#302338'; ctx.beginPath(); ctx.ellipse(27, 18, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#eab593'; ctx.beginPath(); ctx.ellipse(27, 21, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#302338'; ctx.beginPath(); ctx.ellipse(23, 7, 17, 9, -.25, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#20243b'; ctx.fillRect(20, 19, 3, 3); ctx.fillRect(31, 19, 3, 3);
                ctx.strokeStyle = '#eab593'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(13, 40); ctx.lineTo(3, 59); ctx.moveTo(42, 40); ctx.lineTo(54, 49); ctx.stroke();
                ctx.fillStyle = color; ctx.fillRect(48, 40, 16, 22);
                ctx.font = '700 13px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(ally.name, 27, -15);
                ctx.restore();
                }
                if (ally.flash > 0 && ally.target) {
                    ctx.strokeStyle = color; ctx.lineWidth = ally.size === 'big' ? 7 : 3;
                    ctx.beginPath(); ctx.moveTo(sx + 54, sy + 49); ctx.lineTo(ally.target.x - cameraX, ally.target.y); ctx.stroke();
                }
            }
        }

        function placeHiddenPhone() {
            if (!cfg.mechanics.phoneEvent) return;
            const choices = getPlatforms().filter(platform => !platform.isGround && platform.w > 120);
            const platform = choices[Math.floor(choices.length * 0.62)] || getPlatforms().find(platform => platform.isGround);
            if (!platform) return;
            hiddenPhone = {
                x: platform.x + platform.w / 2 - 26,
                y: platform.y - 60,
                w: 52, h: 58, time: 0, collected: false
            };
        }

        function drawHiddenPhone() {
            if (!hiddenPhone || hiddenPhone.collected) return;
            const sx = hiddenPhone.x - cameraX;
            const sy = hiddenPhone.y + Math.sin(hiddenPhone.time * 4) * 5;
            const phone = specialImageStates.phone;
            ctx.save();
            ctx.shadowColor = 'rgba(73,225,255,.95)'; ctx.shadowBlur = 18;
            if (phone && phone.ready && phone.image) {
                const drawW = hiddenPhone.h * (phone.image.naturalWidth / phone.image.naturalHeight);
                ctx.drawImage(phone.image, sx + (hiddenPhone.w - drawW) / 2, sy, drawW, hiddenPhone.h);
            }
            else {
                ctx.fillStyle = '#13253e'; ctx.fillRect(sx + 7, sy, 38, 58);
                ctx.strokeStyle = '#ffe878'; ctx.lineWidth = 3; ctx.strokeRect(sx + 7, sy, 38, 58);
                ctx.fillStyle = '#4be9ff'; ctx.fillRect(sx + 12, sy + 10, 28, 34);
            }
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff4a6'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center';
            ctx.fillText('PHONE', sx + hiddenPhone.w / 2, sy - 9);
            ctx.restore();
        }

        function startMotorcycleSweep() {
            if (motorcycleEvent || gameOver || levelTransition || allLevelsComplete) return;
            const groundY = Number(getLevelConfig().groundY ?? 1080);
            motorcycleEvent = { x: cameraX - 250, y: groundY - 142, w: 220, h: 142, speed: cfg.mechanics.motorcycleSpeed, targetX: getLevelLength() + 260, hitIds: new Set() };
            startMotorcycleSound();
        }

        function drawMotorcycleSweep() {
            if (!motorcycleEvent) return;
            const event = motorcycleEvent, sx = event.x - cameraX, bike = specialImageStates.motorcycle;
            ctx.save(); ctx.globalAlpha = .4; ctx.fillStyle = '#ff9b35'; ctx.fillRect(sx - 110, event.y + event.h - 20, 130, 8); ctx.globalAlpha = 1;
            if (bike && bike.ready && bike.image) {
                const drawW = event.h * (bike.image.naturalWidth / bike.image.naturalHeight);
                ctx.drawImage(bike.image, sx, event.y, drawW, event.h);
            }
            else {
                ctx.fillStyle = '#ed7927'; ctx.fillRect(sx + 40, event.y + 65, 122, 25);
                ctx.fillStyle = '#1a1c26'; ctx.beginPath(); ctx.arc(sx + 63, event.y + 100, 22, 0, Math.PI * 2); ctx.arc(sx + 151, event.y + 100, 22, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        function updateSpecialEvent(dt) {
            if (hiddenPhone && !hiddenPhone.collected) {
                hiddenPhone.time += dt;
                if (intersects(hiddenPhone, { x: player.x + 8, y: player.y + 8, w: player.w - 16, h: player.h + 8 })) {
                    hiddenPhone.collected = true;
                    startMotorcycleSweep();
                }
            }
            if (!motorcycleEvent) return;
            const event = motorcycleEvent, previousX = event.x;
            event.x += event.speed * dt;
            if (motorOscillator && motorAudioContext) motorOscillator.frequency.setTargetAtTime(76 + Math.sin(event.x * 0.045) * 18, motorAudioContext.currentTime, 0.03);
            for (const enemy of enemies) {
                if (event.hitIds.has(enemy.id) || enemy.health <= 0 || enemy.x + enemy.w < previousX || enemy.x > event.x + event.w) continue;
                event.hitIds.add(enemy.id);
                if (enemy.boss || enemyTypes[enemy.type].archetype === 'large') damageEnemy(enemy, Math.ceil(enemy.maxHealth * 0.52));
                else {
                    enemy.health = 0; enemy.defeatTimer = 0.58; enemy.vx = 380; enemy.vy = -300;
                    addDefeatBurst(enemy); playSound('defeat', 0.8);
                }
            }
            if (event.x > event.targetX) { motorcycleEvent = null; stopMotorcycleSound(); }
        }

        function updateHealthPickups(dt) {
            const maxHealth = Math.max(1, Number(cfg.player.maxHealth ?? 5));
            for (const pickup of healthPickups) {
                pickup.time += dt;
                const bobY = pickup.baseY + Math.sin(pickup.time * 5.5) * 6;
                if (player.health < maxHealth && intersects(
                    { x: pickup.x, y: bobY, w: pickup.w, h: pickup.h },
                    { x: player.x + 8, y: player.y + 8, w: player.w - 16, h: player.h + 8 }
                )) {
                    player.health = Math.min(maxHealth, player.health + 1);
                    pickup.collected = true;
                }
            }
            healthPickups = healthPickups.filter(pickup => !pickup.collected);
        }

        function drawAttackEffect(px, drawY) {
            if (!player.attack) return;
            const data = attackDefinitions[player.attack.type];
            const progress = Math.max(0, Math.min(1, player.attack.elapsed / data.duration));
            const reach = data.range * (0.35 + progress * 0.65);
            const active = player.attack.elapsed >= data.activeStart && player.attack.elapsed <= data.activeEnd;
            const frontX = px + player.w - 9;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (player.blueBoost && player.attack.type !== 'beam') { ctx.shadowColor = player.attack.type === 'kick' ? '#ff43df' : '#32ffc5'; ctx.shadowBlur = 18; }
            if (player.attack.type === 'beam') {
                const beamX = px + player.w - 4;
                const beamY = drawY + 42;
                ctx.strokeStyle = 'rgba(72,232,255,.65)'; ctx.lineWidth = 16;
                ctx.beginPath(); ctx.moveTo(beamX, beamY); ctx.lineTo(beamX + reach * 1.4, beamY); ctx.stroke();
                ctx.fillStyle = '#dfffff'; ctx.font = '700 20px system-ui'; ctx.textAlign = 'left';
                for (let i = 0; i < 5; i++) ctx.fillText(['₹','7','4','%','∞'][i], beamX + 30 + i * 68, beamY - 10 - (i % 2) * 18);
            } else if (player.attack.type === 'punch') {
                const fistX = frontX + reach;
                const fistY = drawY + 42;
                ctx.strokeStyle = player.blueBoost ? '#19dca8' : 'rgba(255, 226, 104, 0.42)';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(px + 43, drawY + 42);
                ctx.lineTo(fistX, fistY);
                ctx.stroke();
                ctx.fillStyle = player.blueBoost ? '#70ffcc' : active ? '#fff1a8' : '#ffd866';
                ctx.beginPath();
                ctx.arc(fistX, fistY, active ? 13 : 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = player.blueBoost ? '#e0fff5' : '#e59d3d';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(fistX, fistY, 15, -0.9, 0.8);
                ctx.stroke();
            } else {
                const footX = frontX + reach;
                const footY = drawY + 70 - progress * 22;
                ctx.strokeStyle = player.blueBoost ? '#fa28d4' : 'rgba(190, 183, 255, 0.48)';
                ctx.lineWidth = 11;
                ctx.beginPath();
                ctx.moveTo(px + 39, drawY + 72);
                ctx.lineTo(footX, footY);
                ctx.stroke();
                ctx.fillStyle = player.blueBoost ? '#ff7fec' : active ? '#e4dfff' : '#aaa0ff';
                ctx.beginPath();
                ctx.ellipse(footX, footY, active ? 19 : 15, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = player.blueBoost ? '#fff0fc' : '#6960c5';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(footX, footY, 20, -0.8, 0.7);
                ctx.stroke();
            }

            // A brief gold outline makes the active hitbox readable without
            // turning the normal character silhouette into a debug overlay.
            if (active) {
                ctx.strokeStyle = player.blueBoost ? (player.attack.type === 'kick' ? '#ff43df' : '#32ffc5') : 'rgba(255, 241, 168, 0.75)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 4]);
                ctx.strokeRect(frontX, drawY + (player.attack.type === 'kick' ? 38 : 26), reach, data.height);
                ctx.setLineDash([]);
            }
            ctx.restore();
        }

        function drawPlayer() {
            const heroArt = animatedArt(cfg.characters.find(c=>c.role==='hero').id, {image:playerImage,ready:playerImageReady});
            const heroImage=heroArt.image;
            const px = player.x - cameraX;
            ctx.font = '700 16px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe6a3'; ctx.fillText(cfg.characters.find(c=>c.role==='hero').name, px + player.w / 2, player.y - 12);
            const py = player.y;
            const idleBob = player.animState === 'idle' ? Math.sin(player.animTime * 3.2) * 1.5 : 0;
            const attackBob = player.attack ? Math.sin(player.attack.elapsed * 24) * 1.5 : 0;
            const drawY = py + idleBob + attackBob;
            const running = player.animState === 'moving' && player.onGround && Math.abs(player.vx) > 5;
            const jumping = !player.onGround && !player.attack;
            const runPhase = Math.sin(player.animTime * 15);
            const motionBob = jumping ? -4 : running ? -Math.abs(runPhase) * 3 : 0;
            const motionTilt = player.attack ? (player.facingRight ? 0.045 : -0.045) : jumping ? (player.vx >= 0 ? 0.06 : -0.06) : running ? runPhase * 0.035 : 0;

            if (running) drawRunDust(px + player.w / 2, drawY + player.h - 3, runPhase, '#ffe7bd');
            ctx.save();
            if (player.damageFlash > 0) ctx.globalAlpha = 0.58 + Math.sin(player.damageFlash * 60) * 0.28;
            if (!player.facingRight) {
                ctx.translate(px + player.w / 2, 0);
                ctx.scale(-1, 1);
                ctx.translate(-(px + player.w / 2), 0);
            }
            ctx.translate(px + player.w / 2, py + player.h);
            ctx.rotate(motionTilt);
            // Preserve the source aspect ratio during every animation frame.
            ctx.translate(-(px + player.w / 2), -(py + player.h));

            // The generated sprite is the protagonist's source of truth. Keep a simple
            // vector fallback so edit mode and asset loading remain usable.
            if (heroArt.ready) {
                const spriteH = 88 * cfg.player.scale;
                const spriteW = heroImage.naturalWidth && heroImage.naturalHeight
                    ? spriteH * (heroImage.naturalWidth / heroImage.naturalHeight)
                    : 72;
                const drawX = px + player.w / 2 - spriteW / 2;
                ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = isTouchDevice ? 'medium' : 'high';
                ctx.translate(px+player.w/2,drawY+player.h+16);
                const squash=cfg.animation.preset==='none'?0:Math.sin(player.animTime*7)*cfg.animation.squash;
                ctx.scale(1+squash,1-squash);
                ctx.translate(-(px+player.w/2),-(drawY+player.h+16));
                ctx.drawImage(heroImage, drawX, drawY + player.h + 16 - spriteH + motionBob, spriteW, spriteH);
            } else {
                ctx.fillStyle = cfg.characters.find(c=>c.role==='hero').color;
                ctx.fillRect(px + 12, drawY + 28 + motionBob, 40, 28);
                ctx.fillStyle = '#4a90d9';
                ctx.fillRect(px + 12, drawY + 56 + motionBob, 16, 20);
                ctx.fillRect(px + 36, drawY + 56 + motionBob, 16, 20);
                ctx.fillStyle = '#d4a574';
                ctx.beginPath();
                ctx.arc(px + 32, drawY + 16, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6B3A2A';
                ctx.beginPath();
                ctx.arc(px + 32, drawY + 12, 17, Math.PI, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(px + 14, drawY + 8, 6, 18);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 22, drawY + 12, 10, 8);
                ctx.strokeRect(px + 34, drawY + 12, 10, 8);
            }

            drawAttackEffect(px, drawY);
            ctx.restore();

            if (mode === 'edit') {
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(px - 2, py - 2, player.w + 4, player.h + 4 + 4);
                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(0,255,136,0.85)';
                ctx.font = '600 18px Fredoka';
                ctx.fillText('Player Start', px - 4, py - 10);
            }
        }

        // ── Game loop ──
        let lastTime = 0;
        let paused = false;
        const pauseButton = document.createElement('button');
        pauseButton.textContent = 'Pause / Resume';
        pauseButton.className = 'mobile-pause';
        pauseButton.setAttribute('aria-label', 'Pause or resume game');
        pauseButton.style.cssText = 'position:absolute;right:16px;top:16px;z-index:30;background:#14243de6;color:white;border:1px solid #ffffff55;border-radius:10px;padding:12px;cursor:pointer';
        pauseButton.addEventListener('click', () => { paused = !paused; });
        gameWorld.appendChild(pauseButton);
        const fullscreenButton = document.createElement('button');
        fullscreenButton.className = 'fullscreen-btn mobile-only';
        fullscreenButton.type = 'button';
        fullscreenButton.setAttribute('aria-label', 'Enter fullscreen');
        fullscreenButton.textContent = '⛶';
        fullscreenButton.addEventListener('pointerdown', async e => {
            e.preventDefault();
            mobileHaptic(10);
            try {
                if (!document.fullscreenElement && gameWorld.requestFullscreen) {
                    await gameWorld.requestFullscreen();
                    if (screen.orientation?.lock) { try { await screen.orientation.lock('landscape'); } catch (_) {} }
                } else if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
            } catch (_) {}
        });
        gameWorld.appendChild(fullscreenButton);
        window.addEventListener("blur", () => { Object.keys(keys).forEach(k => keys[k] = false); joystickX = 0; jumpPressed = false; });
        window.addEventListener("keydown", e => { if (e.code === "KeyP" && !e.repeat) paused = !paused; });

        document.addEventListener("visibilitychange", () => { if(document.hidden) paused = true; });

        function gameLoop(timestamp) {
            const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
            lastTime = timestamp;
            // World time advances with physics below.
            screenShakeTimer = Math.max(0, screenShakeTimer - dt);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (mode === 'play' && !paused) {
                // Run game logic at up to 60 Hz and cap catch-up work.
                // This prevents a slow frame from triggering a large burst of AI/physics
                // updates that makes subsequent frames even slower (spiral of death).
                let remaining = Math.min(dt, 1 / 20);
                let substeps = 0;
                while (remaining > 0.0001 && substeps < 3) {
                    const step = Math.min(1 / 60, remaining);
                    worldTime += step;
                    updatePlayer(step);
                    updateLevelTransition(step);
                    remaining -= step;
                    substeps++;
                }
            }
            player.animTime += dt * cfg.animation.speed;
            if (player.attack) {
                player.animState = player.attack.type;
            } else {
                player.animState = player.onGround && Math.abs(player.vx) < 1 ? 'idle' : 'moving';
            }
            if (attackStateEl) {
                attackStateEl.textContent = player.attack
                    ? (player.attack.type === 'beam' ? 'ENERGY BEAM' : player.attack.type === 'punch' ? 'PUNCH!' : 'KICK!')
                    : '';
            }

            // Camera
            const targetCamX = Math.max(0, Math.min(getLevelLength() - viewportWidth(), player.x - viewportWidth() / 2 + player.w / 2));
            cameraX = mode === 'preview' ? cfg.camera : cameraX + (targetCamX - cameraX) * (1 - Math.exp(-8 * dt));
            if (mode === 'preview') { worldTime += dt; enemies.forEach(e => e.animTime += dt); }

            const shake = cfg.mechanics.screenShake && screenShakeTimer > 0
                ? { x: (Math.random() - 0.5) * screenShakePower, y: (Math.random() - 0.5) * screenShakePower }
                : { x: 0, y: 0 };
            ctx.save();
            ctx.scale(WORLD_SCALE, WORLD_SCALE);
            ctx.translate(shake.x, shake.y);
            drawBackground();
            drawPlatforms();
            if (mode === 'preview' && cfg.grid) {
                ctx.save(); ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1;
                const unit = 50 / (460/1080);
                for (let x = -(cameraX % unit); x < viewportWidth(); x += unit) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,viewportHeight()); ctx.stroke(); }
                for (let y = 0; y < viewportHeight(); y += unit) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(viewportWidth(),y); ctx.stroke(); }
                ctx.restore();
            }
            drawExitGate();
            drawPowerups();
            drawHiddenPhone();
            drawHealthPickups();
            drawEnemies();
            drawBossWarning();
            drawPlayer();
            drawMotorcycleSweep();
            drawDefeatBursts();
            drawCombatPopups();
            ctx.restore();
            updateHud();
            if (paused) {
                ctx.fillStyle = 'rgba(12,18,32,.78)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff'; ctx.font = '700 36px Inter'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', 640, 330);
                ctx.font = '18px Inter'; ctx.fillText('Press P or tap Pause / Resume', 640, 375);
            }

            requestAnimationFrame(gameLoop);
        }

        function updateBoss(enemy, dt) {
            const ground = Number(getLevelConfig().groundY), left = getLevelLength() - 900, right = getLevelLength() - 220;
            enemy.y = ground - enemy.h - 16;
            enemy.timer -= dt;
            const enraged = enemy.health <= enemy.maxHealth * getLevelConfig().boss.enrageAt;
            if (enemy.phase === 'approach') {
                enemy.facingRight = player.x + player.w / 2 > enemy.x + enemy.w / 2;
                enemy.vx = Math.abs(player.x + player.w / 2 - enemy.x - enemy.w / 2) > (enemy.w + player.w) / 2 + 20 ? (enemy.facingRight ? 1 : -1) * (enraged ? 180 : 125) : 0;
                enemy.x = Math.max(left, Math.min(right - enemy.w, enemy.x + enemy.vx * dt));
                if (enemy.timer <= 0) {
                    enemy.phase = enemy.attackNumber++ % 2 === 0 ? 'charge-windup' : 'slam-windup';
                    enemy.timer = enraged ? .75 : 1.05; enemy.vx = 0;
                    enemy.attackHitDone = false;
                }
            } else if (enemy.phase.endsWith('windup')) {
                if (enemy.timer <= 0) { enemy.phase = enemy.phase.startsWith('charge') ? 'charge' : 'slam'; enemy.timer = enemy.phase === 'charge' ? .7 : .28; }
            } else if (enemy.phase === 'charge') {
                enemy.vx = (enemy.facingRight ? 1 : -1) * (enraged ? 560 : 440);
                enemy.x = Math.max(left, Math.min(right - enemy.w, enemy.x + enemy.vx * dt));
                // Low shoulder rush: jumping over it is a reliable counter.
                if (!enemy.attackHitDone && intersects({x:enemy.x, y:ground - 88, w:enemy.w, h:88},player)) { hurtPlayer(getLevelConfig().boss.damage,enemy.x); enemy.attackHitDone = true; }
                if (enemy.timer <= 0) { enemy.phase = 'recover'; enemy.timer = enraged ? 1.1 : 1.65; enemy.vx = 0; }
            } else if (enemy.phase === 'slam') {
                if (!enemy.attackHitDone && Math.abs(player.x - enemy.x) < 330 && player.y + player.h > ground - 55) { hurtPlayer(getLevelConfig().boss.damage * 1.25, enemy.x); enemy.attackHitDone = true; }
                if (enemy.timer <= 0) { enemy.phase = 'recover'; enemy.timer = enraged ? 1.1 : 1.65; }
            } else if (enemy.timer <= 0) { enemy.phase = 'approach'; enemy.timer = enraged ? .7 : 1.1; }
        }

        function drawBossWarning() {
            if (!boss || !boss.awakened || boss.health <= 0) return;
            const sx = boss.x - cameraX, ground = Number(getLevelConfig().groundY);
            const warning = boss.phase.endsWith('windup');
            ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 24px Inter';
            ctx.fillStyle = boss.phase === 'recover' ? '#78f7bd' : '#ffbf75';
            const label = boss.phase === 'charge-windup' ? 'SHOULDER RUSH · JUMP!' : boss.phase === 'slam-windup' ? 'GROUND SLAM · GET AIRBORNE!' : boss.phase === 'recover' ? 'EXPOSED · STRIKE NOW!' : boss.health <= boss.maxHealth / 2 ? getLevelConfig().boss.name + ' · ENRAGED' : getLevelConfig().boss.name;
            ctx.fillText(label, sx + boss.w / 2, boss.y - 70);
            if (warning || boss.phase === 'slam') {
                ctx.fillStyle = 'rgba(255,90,80,.28)';
                const x = boss.phase.includes('slam') ? sx - 330 : boss.facingRight ? sx : sx - 400;
                ctx.fillRect(x, ground - 18, boss.phase.includes('slam') ? 660 : 540, 18);
            }
            ctx.restore();
        }

        function updateEnemies(dt) {
            const enemyCfg = cfg.enemies || {};
            const speedBase = Number(enemyCfg.speed ?? 120);
            const aggressionRange = Number(enemyCfg.aggressionRange ?? 104);
            const gravity = Number(cfg.physics.gravity ?? 1800);
            const platforms = getPlatforms();

            for (const enemy of enemies) {
                if (enemy.support && enemy.onGround) {
                    const p = platforms.find(p => p.id === enemy.support.id);
                    if (p) { enemy.x += p.x - enemy.support.x; enemy.y += p.y - enemy.support.y; }
                }
                enemy.animTime += dt;

                // Do not simulate enemies that are still beyond the hero's view.
                // Previously they chased the player from the entire map, walked
                // into unseen gaps, and disappeared before the player reached them.
                const viewLeft = cameraX - 180;
                const viewRight = cameraX + viewportWidth() + 260;
                const inAwarenessWindow = enemy.x + enemy.w >= viewLeft && enemy.x <= viewRight && Math.abs(enemy.x - player.x) < 850;
                if (enemy.boss && !enemy.awakened && player.x < getLevelLength() - 900) continue;
                if (!enemy.awakened) {
                    if (!inAwarenessWindow) continue;
                    enemy.awakened = true;
                }

                enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
                enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
                enemy.attackPulse = Math.max(0, enemy.attackPulse - dt);
                enemy.jumpCooldown = Math.max(0, enemy.jumpCooldown - dt);

                // A short, readable knock-out animation keeps the defeated enemy
                // visible before the runtime removes it from the active roster.
                if (enemy.defeatTimer > 0) {
                    enemy.defeatTimer = Math.max(0, enemy.defeatTimer - dt);
                    enemy.vy += gravity * dt;
                    enemy.x += enemy.vx * dt;
                    enemy.y += enemy.vy * dt;
                    enemy.vx *= Math.pow(0.08, dt);
                    const level = getLevelConfig();
                    if (enemy.y + enemy.h + 16 >= Number(level.groundY ?? 1080)) {
                        enemy.y = Number(level.groundY ?? 1080) - enemy.h - 16;
                        enemy.vy = 0;
                    }
                    continue;
                }

                if (enemy.boss) { updateBoss(enemy, dt); continue; }
                enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
                enemy.pitTimer = Math.max(0, enemy.pitTimer - dt);
                const dx = (player.x + player.w / 2) - (enemy.x + enemy.w / 2);
                const distance = Math.abs(dx);
                const desiredGap = (player.w + enemy.w) / 2 + 12;
                const direction = dx === 0 ? (enemy.facingRight ? 1 : -1) : Math.sign(dx);
                enemy.facingRight = direction > 0;
                const enemyPh = enemy.h + 16;
                const enemyCenter = enemy.x + enemy.w / 2;
                const enemyBottom = enemy.y + enemyPh;
                const playerIsHigher = player.y + player.h + 18 < enemyBottom;
                const support = platforms.find(p => enemy.x + enemy.w > p.x + 4 && enemy.x < p.x + p.w - 4 && Math.abs(enemyBottom - p.y) < 12);
                const walkSpeed = speedBase * enemyTypes[enemy.type].speedScale;
                enemy.vx = distance > desiredGap ? direction * walkSpeed : 0;
                if (enemy.onGround && support) {
                    const front = direction > 0 ? enemy.x + enemy.w : enemy.x;
                    const edge = direction > 0 ? support.x + support.w : support.x;
                    const nearEdge = Math.abs(edge - front) < 34 + walkSpeed * dt;
                    const launch = 900;
                    const needsRouteDecision = nearEdge || Math.abs(player.y + player.h + 16 - support.y) > 60;
                    if (needsRouteDecision) {
                        // Route search is relatively expensive. Only perform it when the
                        // enemy actually needs to jump/change platforms instead of every tick.
                        const candidates = platforms.filter(p => p !== support && p.y >= support.y - 210 && p.y <= support.y + 560).map(p => {
                            const discriminant = launch * launch + 2 * gravity * (p.y - support.y);
                            const flight = (launch + Math.sqrt(Math.max(0, discriminant))) / gravity;
                            const landing = p.moving ? getPlatforms(worldTime + flight).find(next => next.id === p.id) : p;
                            const landingX = Math.max(landing.x + 22, Math.min(landing.x + landing.w - enemy.w - 22, player.x));
                            const velocity = (landingX - enemy.x) / flight;
                            const score = Math.abs(landingX - player.x) + Math.abs(p.y - (player.y + player.h + 16)) * 1.2;
                            return { p, flight, landingX, velocity, score };
                        }).filter(c => c.p.w > enemy.w + 28 && Math.abs(c.velocity) <= 360);
                        candidates.sort((a,b) => a.score - b.score);
                        const currentScore = distance + Math.abs(support.y - (player.y + player.h + 16)) * 1.2;
                        const target = candidates.find(c => c.score < currentScore - 35);
                        enemy.vx = nearEdge ? 0 : enemy.vx;
                        if (target && enemy.jumpCooldown <= 0) {
                            enemy.vy = -launch;
                            enemy.vx = target.velocity;
                            enemy.jumpVelocity = enemy.vx;
                            enemy.onGround = false;
                            enemy.jumpCooldown = 2.8 - enemy.iq * 2;
                        }
                    }
                    enemy.support = support.id ? { id: support.id, x: support.x, y: support.y } : null;
                }
                if (!enemy.onGround && enemy.jumpVelocity !== undefined) enemy.vx = enemy.jumpVelocity;

                if (enemy.onGround && enemy.vx && !enemy.boss) {
                    const crowded = enemies.some(other => other !== enemy && other.health > 0 && Math.abs(other.y - enemy.y) < 40 && (other.x - enemy.x) * direction > 0 && (other.x - enemy.x) * direction < enemy.w + 14);
                    if (crowded && distance > desiredGap + 45) enemy.vx *= .35;
                }
                // Enemies only commit to an attack once the player is close enough.
                // attackPulse is a one-hit window so standing beside an enemy does
                // not drain health every animation frame.
                if (distance <= Math.max(aggressionRange, desiredGap + 8) && enemy.attackTimer <= 0) {
                    const spec = enemyTypes[enemy.type];
                    enemy.attackTimer = spec.attackCooldown;
                    enemy.attackPulse = .52 - enemy.iq * .16;
                    enemy.attackHitDone = false;
                }
                if (enemy.attackPulse > 0 && enemy.attackPulse <= .16 && !enemy.attackHitDone) {
                    const attackBox = {
                        x: enemy.facingRight ? enemy.x + enemy.w - 4 : enemy.x - 28,
                        y: enemy.y + 28,
                        w: 32,
                        h: 46
                    };
                    if (intersects(attackBox, { x: player.x + 8, y: player.y + 8, w: player.w - 16, h: player.h + 8 })) {
                        const damage = Number(enemyCfg[enemyTypes[enemy.type].damageKey] ?? enemyTypes[enemy.type].attackDamage);
                        hurtPlayer(damage, enemy.x + enemy.w / 2);
                        enemy.attackHitDone = true;
                    }
                }

                enemy.vy += gravity * dt;
                enemy.x += enemy.vx * dt;
                enemy.y += enemy.vy * dt;
                enemy.onGround = false;
                for (const plat of platforms) {
                    if (enemy.x + enemy.w > plat.x && enemy.x < plat.x + plat.w) {
                        const enemyBottom = enemy.y + enemyPh;
                        if (enemy.vy >= 0 && enemyBottom >= plat.y && enemyBottom <= plat.y + plat.h + enemy.vy * dt + 8) {
                            enemy.y = plat.y - enemyPh;
                            enemy.vy = 0;
                            enemy.onGround = true;
                            enemy.jumpVelocity = undefined;
                            enemy.support = plat.id ? { id: plat.id, x: plat.x, y: plat.y } : null;
                            if (plat.isGround) enemy.lastSafeX = enemy.x;
                        }
                    }
                }

                // Low-IQ enemies pay for a bad read of a pit. High-IQ types have
                // already stopped or jumped before reaching this point.
                const levelGroundY = Number(getLevelConfig().groundY ?? 1080);
                if (enemy.y > levelGroundY + 160) {
                    enemy.health = 0;
                    enemy.defeatTimer = 0;
                    addDefeatBurst(enemy);
                }
            }

            // Resolve each attack once per enemy, allowing one punch or kick to
            // hit multiple enemies while preventing duplicate damage per swing.
            const hitbox = getAttackHitbox();
            if (hitbox && hitbox.active && player.attack) {
                for (const enemy of enemies) {
                    if (enemy.defeatTimer > 0 || player.attack.hitIds.has(enemy.id)) continue;
                    if (intersects(hitbox, enemyBodyBox(enemy))) {
                        player.attack.hitIds.add(enemy.id);
                        damageEnemy(enemy, hitbox.damage, player.attack.type);
                    }
                }
            }

            updateHealthPickups(dt);
            for (const burst of defeatBursts) burst.time += dt;
            defeatBursts = defeatBursts.filter(burst => burst.time < burst.duration);
            enemies = enemies.filter(enemy => enemy.defeatTimer > 0 || enemy.health > 0);
            // `every` correctly treats an emptied roster as cleared. The previous
            // `enemies.length > 0` guard stranded the game after the last KO faded.
            if (mode === 'play' && enemySpawned && (!getLevelConfig().requireDefeatAll || enemies.every(enemy => enemy.health <= 0))) {
                exitUnlocked = true;
            }
        }

        function updatePlayer(dt) {
            if (gameOver || allLevelsComplete) return;
            // Drops remain collectible during the short stage-clear card, so a
            // refill from the final defeated enemy is not lost immediately.
            if (levelTransition) {
                updateHealthPickups(dt);
                return;
            }
            if (!enemySpawned) spawnEnemies();
            // The exit is a hard progress checkpoint. Reaching it must never be
            // blocked by an AI actor stranded behind a pit or on a lift.
            if (player.x + player.w >= getLevelLength() - 180 && exitUnlocked && (!getLevelConfig().boss?.enabled || bossDefeated)) {
                startLevelTransition();
                return;
            }
            styleTimer = Math.max(0, styleTimer - dt);
            if (!styleTimer) styleChain = 0;
            combatPopups = combatPopups.filter(p => (p.life -= dt) > 0);
            player.hurtTimer = Math.max(0, player.hurtTimer - dt);
            player.damageFlash = Math.max(0, player.damageFlash - dt);
            const speed = Number(cfg.player.moveSpeed ?? 400);
            const gravity = Number(cfg.physics.gravity ?? 1800);
            const jumpForce = Number(cfg.player.jumpForce ?? 950);

            for (const type of Object.keys(attackCooldowns)) attackCooldowns[type] = Math.max(0, attackCooldowns[type] - dt);
            if (player.beamActive && !pendingAttack && (keys.KeyJ || keys.KeyK)) pendingAttack = "beam";
            if (pendingAttack) {
                const requestedAttack = pendingAttack;
                pendingAttack = null;
                startAttack(requestedAttack);
            }
            if (player.attack) {
                player.attack.elapsed += dt;
                if (player.attack.elapsed >= attackDefinitions[player.attack.type].duration) {
                    player.attack = null;
                }
            }

            const supportNow = getPlatforms().find(p => p.id && p.id === player.support?.id);
            if (supportNow && player.onGround) {
                player.x += supportNow.x - player.support.x;
                player.y += supportNow.y - player.support.y;
            }
            player.support = null;
            if (getLevelConfig().boss?.enabled && boss && boss.health > 0 && player.x > getLevelLength() - 900) {
                boss.awakened = true;
                player.x = Math.max(getLevelLength() - 900, Math.min(getLevelLength() - 220, player.x));
            }
            // Horizontal input
            let inputX = 0;
            if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;
            if (Math.abs(joystickX) > 0.15) inputX += joystickX;
            inputX = Math.max(-1, Math.min(1, inputX));

            const attackMoveScale = player.attack ? 0.45 : 1;
            player.vx = inputX * speed * attackMoveScale;
            if (inputX > 0.1) player.facingRight = true;
            if (inputX < -0.1) player.facingRight = false;

            // Jump
            const wantJump = keys['KeyW'] || keys['ArrowUp'] || keys['Space'] || jumpPressed;
            if (player.onGround) airJumpsUsed=0;
            if (wantJump && (player.onGround || airJumpsUsed < cfg.player.airJumps) && !jumpConsumed) {
                if (!player.onGround) airJumpsUsed++;
                playSound('jump');
                player.vy = -jumpForce;
                player.onGround = false;
                jumpConsumed = true;
            }
            if (!wantJump) jumpConsumed = false;

            const previousFeet = player.y + player.h + 16;
            // Gravity
            player.vy += gravity * dt;

            // Move within the authored bounds of the current level. Ground holes
            // are intentionally not clamped horizontally, so a missed jump falls.
            player.x += player.vx * dt;
            player.x = Math.max(0, Math.min(getLevelLength() - player.w, player.x));
            player.y += player.vy * dt;
            if (boss && boss.awakened && boss.health > 0) player.x = Math.max(getLevelLength() - 900, Math.min(getLevelLength() - 220, player.x));

            if (player.vy > 100) {
                const stompTarget = enemies.find(e => !e.boss && e.health > 0 && e.defeatTimer <= 0 && e.hurtTimer <= 0 && player.x + player.w - 10 > e.x && player.x + 10 < e.x + e.w && previousFeet <= e.y + 24 && player.y + player.h + 16 >= e.y + 16);
                if (stompTarget) {
                    player.y = stompTarget.y + 16 - player.h - 16;
                    player.vy = -640; player.support = null;
                    damageEnemy(stompTarget, cfg.mechanics.stompDamage, 'stomp');
                    playSound('kick', .4);
                }
            }
            // Collision
            player.onGround = false;
            const platforms = getPlatforms();
            const pw = player.w;
            const ph = player.h + 16; // include feet

            for (const plat of platforms) {
                // Simple AABB top collision
                const playerBottom = player.y + ph;
                const playerRight = player.x + pw;

                if (playerRight > plat.x && player.x < plat.x + plat.w) {
                    // Falling onto platform top
                    if (player.vy >= 0 && playerBottom >= plat.y && playerBottom <= plat.y + plat.h + player.vy * dt + 8) {
                        player.y = plat.y - ph;
                        player.vy = 0;
                        player.onGround = true;
                        player.support = plat.id ? { id: plat.id, x: plat.x, y: plat.y } : null;
                    }
                }
            }

            if (player.y > Number(getLevelConfig().groundY ?? 1080) + 140 ||
                (!player.onGround && player.vy >= 0 && isOverGroundHole(player.x, player.w) && player.y + ph >= Number(getLevelConfig().groundY ?? 1080) - 10)) {
                handlePlayerFall();
            } else if (player.onGround && !isOverGroundHole(player.x, player.w)) {
                lastSafeX = player.x;
            }
            fallRespawnTimer = Math.max(0, fallRespawnTimer - dt);
            updatePowerups(dt);
            updateSpecialEvent(dt);
            updateEnemies(dt);
        }


        let virtualKeys = [];
        window.addEventListener('message', event => {
          if (event.source !== parent || event.origin !== location.origin) return;
          if (event.data?.type === 'game-gift:viewport' && mode === 'preview') { cfg.camera = event.data.camera; cfg.grid = !!event.data.grid; }
          if (event.data?.type === 'game-gift:keys' && Array.isArray(event.data.keys)) {
            const next = event.data.keys;
            if (next.includes('KeyJ') && !keys.KeyJ) pendingAttack = 'punch';
            if (next.includes('KeyK') && !keys.KeyK) pendingAttack = 'kick';
            for (const key of virtualKeys) if (!next.includes(key)) keys[key]=false;
            for (const key of next) keys[key]=true;
            virtualKeys=next;
          }
        });
        beginLevel(cfg.startLevel || 0);
        if (cfg.mechanics.helpersAtStart || mode === 'preview') activatePowerup('companion');
        if (mode === 'preview') { player.x = cfg.camera + 220; companions.forEach((h,i) => { h.x=cfg.camera+360+i*120; h.y=player.y; }); }
        canvas.addEventListener('click', event => {
          const r=canvas.getBoundingClientRect();
          parent.postMessage({type:'game-gift:point',x:(event.clientX-r.left)/r.width*viewportWidth()+cameraX,y:(event.clientY-r.top)/r.height*viewportHeight()}, location.origin);
        });

        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

let started = false;
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'game-gift:init' || started) return;
  started = true;
  window.gameConfig = event.data.config;
  document.body.classList.toggle('preview', event.data.mode === 'preview');
  run(event.data.mode);
});
parent.postMessage({type:'game-gift:ready'}, location.origin);
