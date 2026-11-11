        // ─── THEME MANAGER (จดจำธีมของเครื่องตามที่เลือกไว้ในแดชบอร์ด) ───
        function getAppTheme() {
            try {
                const saved = localStorage.getItem('bec_app_theme');
                if (saved && ['black', 'kuromi', 'vintage', 'minecraft'].includes(saved)) {
                    return saved;
                }
            } catch (e) {}
            return 'black';
        }

        function applyAppTheme(theme) {
            if (!['black', 'kuromi', 'vintage', 'minecraft'].includes(theme)) {
                theme = 'black';
            }
            document.documentElement.setAttribute('data-theme', theme);

            if (theme === 'kuromi') {
                startSilkAnimation();
            } else {
                stopSilkAnimation();
            }

            if (theme === 'black') {
                ensureBlackVideoPlaying();
            } else {
                const bgVid = document.getElementById('blackBgVideo');
                if (bgVid) {
                    bgVid.style.display = 'none';
                    bgVid.style.opacity = '0';
                    if (typeof bgVid.pause === 'function') {
                        try { bgVid.pause(); } catch (e) {}
                    }
                }
            }
        }


        // ─── SILK CANVAS ANIMATION (KUROMI THEME) ───
        let animId = null;
        let time = 0;
        let silkCanvasInited = false;
        let ctx = null;
        let canvas = null;

        function initSilkCanvas() {
            canvas = document.getElementById('silkCanvas');
            if (!canvas) return;
            ctx = canvas.getContext('2d');

            function resize() {
                canvas.width  = Math.floor(window.innerWidth / 2);
                canvas.height = Math.floor(window.innerHeight / 2);
            }
            window.addEventListener('resize', resize);
            resize();
            silkCanvasInited = true;
        }

        function startSilkAnimation() {
            if (!silkCanvasInited) initSilkCanvas();
            if (animId || !canvas || !ctx) return;

            const scale = 3.5;
            const speed = 0.008;
            const noiseIntensity = 1.2;

            function noise(x, y) {
                const G = 2.71828;
                const rx = G * Math.sin(G * x);
                const ry = G * Math.sin(G * y);
                return (rx * ry * (1 + x)) % 1;
            }

            function loop() {
                const w = canvas.width;
                const h = canvas.height;

                const bg = ctx.createLinearGradient(0, 0, w, h);
                bg.addColorStop(0,   '#0c0a10');
                bg.addColorStop(0.35,'#201529');
                bg.addColorStop(0.7, '#140e1b');
                bg.addColorStop(1,   '#09070c');
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, w, h);

                const imgData = ctx.createImageData(w, h);
                const d = imgData.data;
                const tOff = speed * time;

                for (let y = 0; y < h; y += 2) {
                    for (let x = 0; x < w; x += 2) {
                        const nx = x / w * scale;
                        const ny = y / h * scale;

                        const pattern = Math.sin(
                            nx * 3 + Math.sin(ny * 2 + tOff) * 1.5 +
                            Math.cos(nx * 2 - tOff * 0.7) * 1.2
                        );

                        const rnd = noise(x, y);
                        const intensity = Math.max(0, pattern - rnd / 15.0 * noiseIntensity);

                        const r = Math.floor(180 * intensity);
                        const g = Math.floor(140 * intensity);
                        const b = Math.floor(205 * intensity);

                        const idx = (y * w + x) * 4;
                        if (idx < d.length) {
                            d[idx]     = r;
                            d[idx + 1] = g;
                            d[idx + 2] = b;
                            d[idx + 3] = 255;
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                const ov = ctx.createRadialGradient(
                    w/2, h/2, 0,
                    w/2, h/2, Math.max(w, h) / 1.5
                );
                ov.addColorStop(0, 'rgba(12, 10, 16, 0.2)');
                ov.addColorStop(1, 'rgba(9, 7, 12, 0.75)');
                ctx.fillStyle = ov;
                ctx.fillRect(0, 0, w, h);

                time++;
                animId = requestAnimationFrame(loop);
            }

            loop();
        }

        function stopSilkAnimation() {
            if (animId) {
                cancelAnimationFrame(animId);
                animId = null;
            }
        }

        // ─── AMBIENT BLACK HOLE BACKGROUND (30FPS HARDWARE VIDEO + ZERO-PLAY-BUTTON FALLBACK) ───
        let blackVideoInteractionArmed = false;

        function showAndPlayBlackVideo(vid) {
            if (!vid) return;
            vid.style.display = 'block';
            requestAnimationFrame(function () {
                vid.style.opacity = '1';
            });
        }

        function ensureBlackVideoPlaying() {
            if (getAppTheme() !== 'black') return;
            const bgVid = document.getElementById('blackBgVideo');
            if (!bgVid || typeof bgVid.play !== 'function') return;

            bgVid.muted = true;
            bgVid.defaultMuted = true;
            bgVid.playsInline = true;
            bgVid.loop = true;

            const p = bgVid.play();
            if (p !== undefined) {
                p.then(function () {
                    // Autoplay succeeded (Desktop, Laptop, Android, iOS without Low Power Mode)
                    showAndPlayBlackVideo(bgVid);
                }).catch(function () {
                    // iOS Low Power Mode (โหมดประหยัดพลังงาน) หรือ Browser บล็อก autoplay
                    // ซ่อนแท็ก video เพื่อไม่ให้ WebKit วาดปุ่ม Play Icon ทับบนการ์ดล็อกอิน 100%
                    bgVid.style.display = 'none';
                    bgVid.style.opacity = '0';

                    if (blackVideoInteractionArmed) return;
                    blackVideoInteractionArmed = true;

                    const resumePlaybackSilently = function () {
                        if (getAppTheme() === 'black') {
                            const v = document.getElementById('blackBgVideo');
                            if (v && typeof v.play === 'function') {
                                v.muted = true;
                                v.playsInline = true;
                                v.loop = true;
                                const playPromise = v.play();
                                if (playPromise && typeof playPromise.then === 'function') {
                                    playPromise.then(function () {
                                        showAndPlayBlackVideo(v);
                                    }).catch(function () {});
                                }
                            }
                        }
                        ['touchstart', 'touchend', 'click', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) {
                            window.removeEventListener(ev, resumePlaybackSilently, { capture: true, passive: true });
                            document.removeEventListener(ev, resumePlaybackSilently, { capture: true, passive: true });
                        });
                        blackVideoInteractionArmed = false;
                    };

                    ['touchstart', 'touchend', 'click', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) {
                        window.addEventListener(ev, resumePlaybackSilently, { capture: true, passive: true, once: true });
                        document.addEventListener(ev, resumePlaybackSilently, { capture: true, passive: true, once: true });
                    });
                });
            }
        }

        const bgVidElem = document.getElementById('blackBgVideo');
        if (bgVidElem && typeof bgVidElem.play === 'function') {
            bgVidElem.muted = true;
            bgVidElem.defaultMuted = true;
            bgVidElem.playsInline = true;
            bgVidElem.loop = true;

            bgVidElem.addEventListener('ended', function () {
                bgVidElem.currentTime = 0;
                bgVidElem.play().catch(function () {});
            });

            bgVidElem.addEventListener('canplay', function () {
                if (getAppTheme() === 'black') ensureBlackVideoPlaying();
            });
            bgVidElem.addEventListener('loadeddata', function () {
                if (getAppTheme() === 'black') ensureBlackVideoPlaying();
            });
        }

        // เมื่อสลับแท็บไปแล้วสลับกลับมา
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && getAppTheme() === 'black') {
                ensureBlackVideoPlaying();
            } else if (document.hidden) {
                const bgVid = document.getElementById('blackBgVideo');
                if (bgVid && typeof bgVid.pause === 'function') {
                    try { bgVid.pause(); } catch (e) {}
                }
            }
        });

        // Initialize Theme & Background immediately
        applyAppTheme(getAppTheme());

        // Hide the "loading" hints once loaded
        window.addEventListener('load', function () {
            setTimeout(function () {
                const h1 = document.getElementById('loadingHintKuromi');
                const h2 = document.getElementById('loadingHintVintage');
                const h3 = document.getElementById('loadingHintMinecraft');
                const h4 = document.getElementById('loadingHintBlack');
                if (h1) h1.style.display = 'none';
                if (h2) h2.style.display = 'none';
                if (h3) h3.style.display = 'none';
                if (h4) h4.style.display = 'none';
            }, 1800);
        });

        // Supabase OAuth Login
        async function signInWithGoogle() {
            const btnWraps = document.querySelectorAll('.google-btn-wrapper');
            btnWraps.forEach(bw => bw.style.display = 'none');

            const hintHtml = '<div class="spinner"></div><span>กำลังพาท่านไปหน้าล็อกอิน...</span>';
            const h1 = document.getElementById('loadingHintKuromi');
            const h2 = document.getElementById('loadingHintVintage');
            const h3 = document.getElementById('loadingHintMinecraft');
            const h4 = document.getElementById('loadingHintBlack');
            if (h1) { h1.innerHTML = hintHtml; h1.style.display = 'flex'; }
            if (h2) { h2.innerHTML = hintHtml; h2.style.display = 'flex'; }
            if (h3) { h3.innerHTML = hintHtml; h3.style.display = 'flex'; }
            if (h4) { h4.innerHTML = hintHtml; h4.style.display = 'flex'; }

            const { error } = await window.myAppDb.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) {
                console.error('Error logging in:', error.message);
                btnWraps.forEach(bw => bw.style.display = 'flex');
                if (h1) h1.style.display = 'none';
                if (h2) h2.style.display = 'none';
                if (h3) h3.style.display = 'none';
                if (h4) h4.style.display = 'none';

                const errKuromi = document.getElementById('errorMessageKuromi');
                const errVintage = document.getElementById('errorMessageVintage');
                const errMinecraft = document.getElementById('errorMessageMinecraft');
                const errBlack = document.getElementById('errorMessageBlack');
                [errKuromi, errVintage, errMinecraft, errBlack].forEach(e => {
                    if (e) {
                        e.textContent = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message;
                        e.style.display = 'block';
                    }
                });
            }
        }

        // ─── MAINTENANCE MODE LOGIC ───
        function checkMaintenance() {
            const isMaintenance = window.MAINTENANCE_CONFIG && window.MAINTENANCE_CONFIG.enabled;
            const urlParams = new URLSearchParams(window.location.search);
            const adminParam = urlParams.get('admin');

            if (isMaintenance) {
                document.body.classList.add('in-maintenance');
                if (adminParam === '1' || adminParam === 'true') {
                    document.body.classList.add('admin-unlocked');
                }
            }
        }

        function toggleAdminLogin() {
            document.body.classList.add('admin-unlocked');
        }

        // Run immediately when script evaluates
        checkMaintenance();

        window.addEventListener('load', async () => {
            checkMaintenance();

            const { data: { session } } = await window.myAppDb.auth.getSession();
            
            if (session) {
                // If in maintenance mode, check if this user is Admin
                if (window.MAINTENANCE_CONFIG && window.MAINTENANCE_CONFIG.enabled) {
                    try {
                        const userEmail = session.user.email;
                        const { data } = await window.myAppDb.from('users').select('role').eq('email', userEmail).maybeSingle();
                        if (!data || data.role !== 'Admin') {
                            await window.myAppDb.auth.signOut();
                            sessionStorage.removeItem('loggedInUser');
                            return;
                        }
                    } catch (e) {
                        console.error("Maintenance check error:", e);
                        return;
                    }
                }

                document.querySelectorAll('.google-btn-wrapper').forEach(bw => bw.style.display = 'none');
                const hintHtml = '<div class="spinner"></div><span>กำลังตรวจสอบข้อมูล...</span>';
                const h1 = document.getElementById('loadingHintKuromi');
                const h2 = document.getElementById('loadingHintVintage');
                const h3 = document.getElementById('loadingHintMinecraft');
                const h4 = document.getElementById('loadingHintBlack');
                if (h1) { h1.innerHTML = hintHtml; h1.style.display = 'flex'; }
                if (h2) { h2.innerHTML = hintHtml; h2.style.display = 'flex'; }
                if (h3) { h3.innerHTML = hintHtml; h3.style.display = 'flex'; }
                if (h4) { h4.innerHTML = hintHtml; h4.style.display = 'flex'; }

                if (typeof handleSupabaseSession === 'function') {
                    handleSupabaseSession(session);
                }
            } else {
                window.myAppDb.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        if (window.MAINTENANCE_CONFIG && window.MAINTENANCE_CONFIG.enabled) {
                            try {
                                const userEmail = session.user.email;
                                const { data } = await window.myAppDb.from('users').select('role').eq('email', userEmail).maybeSingle();
                                if (!data || data.role !== 'Admin') {
                                    await window.myAppDb.auth.signOut();
                                    sessionStorage.removeItem('loggedInUser');
                                    alert('ระบบอยู่ระหว่างปิดปรับปรุงชั่วคราว เปิดให้บริการอีกครั้งวันที่ 11 พ.ย. เวลา 11:11 น.');
                                    location.reload();
                                    return;
                                }
                            } catch (e) {
                                console.error("Maintenance check error:", e);
                                return;
                            }
                        }

                        document.querySelectorAll('.google-btn-wrapper').forEach(bw => bw.style.display = 'none');
                        const hintHtml = '<div class="spinner"></div><span>กำลังตรวจสอบข้อมูล...</span>';
                        const h1 = document.getElementById('loadingHintKuromi');
                        const h2 = document.getElementById('loadingHintVintage');
                        const h3 = document.getElementById('loadingHintMinecraft');
                        const h4 = document.getElementById('loadingHintBlack');
                        if (h1) { h1.innerHTML = hintHtml; h1.style.display = 'flex'; }
                        if (h2) { h2.innerHTML = hintHtml; h2.style.display = 'flex'; }
                        if (h3) { h3.innerHTML = hintHtml; h3.style.display = 'flex'; }
                        if (h4) { h4.innerHTML = hintHtml; h4.style.display = 'flex'; }
                        if (typeof handleSupabaseSession === 'function') {
                            handleSupabaseSession(session);
                        }
                    }
                });
            }
        });
