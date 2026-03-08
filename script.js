document.addEventListener('DOMContentLoaded', () => {

    // ── State ──
    let currentSlide = 0;
    const totalSlides = 3;
    let solutionPhase = -1;
    const solutionPhases = ['chat', 'video', 'reveal'];
    let isEnglish = false;
    let painClockInterval = null;
    let personaInterval = null;
    let currentPersona = 0;
    let navLocked = false;
    let blackoutTimeouts = [];
    let demoTimeouts = [];
    let onboardTimeouts = [];

    // ── Elements ──
    const slider = document.getElementById('slider');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressFill = document.getElementById('progressFill');
    const slideSolution = document.getElementById('slide-solution');
    const langToggle = document.getElementById('langToggle');
    const fsToggle = document.getElementById('fsToggle');
    const customCursor = document.getElementById('customCursor');
    const cinematicCurtain = document.getElementById('cinematicCurtain');
    const revealFlash = document.getElementById('revealFlash');
    const audioToggle = document.getElementById('audioToggle');
    const finaleBrand = document.getElementById('finaleBrand');
    const finaleCta = document.getElementById('finaleCta');

    // ── Web Audio API — Sound Design ──
    class PitchAudio {
        constructor() {
            this.ctx = null;
            this.muted = false;
            this.initialized = false;
            // Respect prefers-reduced-motion
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.muted = true;
            }
        }

        init() {
            if (this.initialized) return;
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        }

        _tone(freq, duration, type = 'sine', volume = 0.15) {
            if (this.muted || !this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        }

        whoosh(ascending = true) {
            if (this.muted || !this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 0.5;
            osc.type = 'sawtooth';
            const now = this.ctx.currentTime;
            if (ascending) {
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
                filter.frequency.setValueAtTime(400, now);
                filter.frequency.exponentialRampToValueAtTime(2000, now + 0.6);
            } else {
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
                filter.frequency.setValueAtTime(1500, now);
                filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);
            }
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (ascending ? 0.8 : 0.3));
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(now + (ascending ? 0.8 : 0.3));
        }

        tick() {
            this._tone(3500, 0.06, 'square', 0.05);
        }

        pop() {
            this._tone(1200, 0.1, 'sine', 0.12);
            setTimeout(() => this._tone(1800, 0.05, 'sine', 0.06), 30);
        }

        chime() {
            this._tone(880, 0.3, 'sine', 0.1);
            setTimeout(() => this._tone(1108, 0.25, 'sine', 0.08), 100);
        }

        reveal() {
            if (this.muted || !this.ctx) return;
            this.whoosh(true);
            // Triumphant major chord after whoosh
            setTimeout(() => {
                this._tone(523.25, 1.2, 'sine', 0.1);  // C5
                this._tone(659.25, 1.2, 'sine', 0.08); // E5
                this._tone(783.99, 1.2, 'sine', 0.06); // G5
            }, 400);
        }

        openingSequence() {
            if (this.muted || !this.ctx) return;
            this.whoosh(true);
            // 3 ascending tones
            setTimeout(() => this._tone(440, 0.3, 'sine', 0.08), 300);
            setTimeout(() => this._tone(554, 0.25, 'sine', 0.06), 500);
            setTimeout(() => this._tone(659, 0.4, 'sine', 0.07), 650);
        }

        toggleMute() {
            this.muted = !this.muted;
            return this.muted;
        }
    }

    const pitchAudio = new PitchAudio();

    // Audio toggle button
    audioToggle.addEventListener('click', () => {
        pitchAudio.init();
        const muted = pitchAudio.toggleMute();
        audioToggle.querySelector('.audio-icon-on').style.display = muted ? 'none' : '';
        audioToggle.querySelector('.audio-icon-off').style.display = muted ? '' : 'none';
        audioToggle.classList.toggle('muted', muted);
    });

    // Initialize audio on first user interaction
    function initAudioOnce() {
        pitchAudio.init();
        document.removeEventListener('click', initAudioOnce);
        document.removeEventListener('keydown', initAudioOnce);
        document.removeEventListener('touchstart', initAudioOnce);
    }
    document.addEventListener('click', initAudioOnce);
    document.addEventListener('keydown', initAudioOnce);
    document.addEventListener('touchstart', initAudioOnce);

    // ── Translations ──
    const translations = {
        fr: {
            'label-1': 'CIBLE', 'label-2': 'PROBLÈME', 'label-3': 'SOLUTION',
            'h1-1': 'Les pro.<br>Qui doivent convaincre.<br>Avant de facturer.',
            'ticker-1': ['Consultants', 'Freelances', 'Agences', 'Courtiers', 'Construction', 'Pigistes', 'Comptables', 'Avocats', 'Architectes'],
            'm1-title': 'Consultants & Freelances',
            'm1-desc': 'Travaillent seuls, temps limité pour rédiger des propositions convaincantes.',
            'm2-title': 'Agences & PME',
            'm2-desc': 'Volume élevé de soumissions, besoin de standardiser la qualité.',
            'm3-title': 'Construction',
            'm3-desc': 'Propositions techniques complexes avec devis détaillés et délais stricts.',
            'h1-2': 'La rédaction<br>Prend Trop<br>De Temps.',
            'ticker-2': ['Collecte d\'infos', 'Rédaction', 'Mise en page', 'Relecture', 'Révisions', 'Envoi', 'Suivi'],
            'm4-title': 'Temps Moyen',
            'm4-desc': 'Temps requis pour rédiger une proposition professionnelle complète.',
            'm5-title': 'Pertes de Mandats',
            'm5-desc': 'Contrats perdus faute de pouvoir soumettre à temps face à la compétition.',
            'm6-title': 'Revenus Perdus',
            'm6-desc': 'Proposition jamais envoyée ou envoyée trop tard.',
            'h1-3': 'Générateur<br>Intelligent<br>De Propositions.',
            'finale-vs': 'au lieu de',
            'finale-tagline': "L'humain décide. L'IA exécute.",
            'finale-cta': 'Récupérez votre temps →',
            'stack-title': 'Stack Technique',
            'tech-1': 'Backend & API',
            'tech-2': 'Interactivité frontend',
            'tech-3': 'Génération de propositions',
            'tech-4': 'Base de données',
            'tech-5': 'Interface & design',
            'fs': 'PLEIN ÉCRAN',
            'brand': [
                'Qui doit convaincre?',
                'Le problème #1 des professionnels',
                'La solution en action'
            ],
            'demo-input': 'Message...',
            'demo-greet': 'Bonjour! Nouveau client ou suivi?',
            'demo-btn-new': 'Nouveau client',
            'demo-btn-followup': 'Suivi',
            'demo-name': 'Nom du client?',
            'demo-user-name': 'Marc Dupont, Agence Médiamax',
            'demo-email': 'Courriel du client?',
            'demo-user-email': 'marc@mediamax.ca',
            'demo-file-created': '✓ Dossier créé — Marc Dupont, Agence Médiamax',
            'demo-type': 'Quel type de projet?',
            'demo-btn-web': 'App web',
            'demo-btn-mobile': 'App mobile',
            'demo-btn-ai': 'Agent IA',
            'demo-describe': 'Décrivez le besoin.',
            'demo-user-need': 'Automatiser nos propositions clients. Budget autour de 15k, livraison 3 mois.',
            'demo-confirm': 'Compris! Budget 15 000$, livraison 3 mois. Hébergement au Canada requis?',
            'demo-btn-yes': 'Oui',
            'demo-btn-no': 'Non',
            'demo-generating': 'Génération de votre proposition...',
            'demo-ready': '✓ Proposition prête!',
            'demo-file-name': 'Proposition_AgentIA.pdf',
            'demo-approve-ask': 'Approuver l\'envoi à marc@mediamax.ca?',
            'demo-btn-approve': '✓ Approuvé — envoyer',
            'demo-btn-edit': 'Modifier',
            'demo-sent': '✉️ Proposition envoyée à marc@mediamax.ca!',
            'onboard-welcome': 'Bienvenue! Créons votre espace.',
            'onboard-company': 'Nom de votre entreprise?',
            'onboard-user-company': 'Agence Médiamax',
            'onboard-company-ok': '✓ Espace créé — Agence Médiamax',
            'onboard-sector': 'Votre secteur d\'activité?',
            'onboard-btn-consulting': 'Consultation',
            'onboard-btn-agency': 'Agence',
            'onboard-btn-construction': 'Construction',
            'onboard-services': 'Quels services offrez-vous?',
            'onboard-user-services': 'Développement web, Design UI/UX, Agents IA',
            'onboard-services-ok': '✓ 3 services ajoutés à votre catalogue.',
            'onboard-import': 'Importer une ancienne proposition pour calibrer l\'IA?',
            'onboard-btn-import': '📄 Importer',
            'onboard-btn-skip': 'Passer',
            'onboard-file': 'Proposition_Refonte_2025.pdf',
            'onboard-import-ok': '✓ Proposition analysée — ton, structure et tarifs intégrés!',
            'onboard-ready': '✓ Votre espace est prêt! Vous pouvez maintenant générer des propositions.',
        },
        en: {
            'label-1': 'TARGET', 'label-2': 'PROBLEM', 'label-3': 'SOLUTION',
            'h1-1': 'Pros.<br>Who must convince.<br>Before they bill.',
            'ticker-1': ['Consultants', 'Freelancers', 'Agencies', 'Brokers', 'Construction', 'Accountants', 'Lawyers', 'Architects', 'Engineers'],
            'm1-title': 'Consultants & Freelancers',
            'm1-desc': 'Working alone, limited time to draft convincing proposals.',
            'm2-title': 'Agencies & SMBs',
            'm2-desc': 'High volume of submissions, need to standardize quality.',
            'm3-title': 'Construction',
            'm3-desc': 'Complex technical proposals with detailed quotes and strict timelines.',
            'h1-2': 'Drafting<br>Takes Too<br>Much Time.',
            'ticker-2': ['Gathering info', 'Drafting', 'Formatting', 'Proofreading', 'Revisions', 'Sending', 'Follow-up'],
            'm4-title': 'Average Time',
            'm4-desc': 'Time required to draft a professional and comprehensive business proposal.',
            'm5-title': 'Lost Mandates',
            'm5-desc': 'Contracts lost due to the inability to submit on time against competition.',
            'm6-title': 'Lost Revenue',
            'm6-desc': 'Proposal never sent or sent too late.',
            'h1-3': 'Intelligent<br>Proposal<br>Generator.',
            'finale-vs': 'instead of',
            'finale-tagline': 'Humans decide. AI executes.',
            'finale-cta': 'Reclaim your time →',
            'stack-title': 'Tech Stack',
            'tech-1': 'Backend & API',
            'tech-2': 'Frontend interactivity',
            'tech-3': 'Proposal generation',
            'tech-4': 'Database',
            'tech-5': 'Interface & design',
            'fs': 'FULLSCREEN',
            'brand': [
                'Who must convince?',
                'The #1 problem for professionals',
                'The solution in action'
            ],
            'demo-input': 'Message...',
            'demo-greet': 'Hello! New client or follow-up?',
            'demo-btn-new': 'New client',
            'demo-btn-followup': 'Follow-up',
            'demo-name': 'Client name?',
            'demo-user-name': 'Marc Dupont, Mediamax Agency',
            'demo-email': 'Client email?',
            'demo-user-email': 'marc@mediamax.ca',
            'demo-file-created': '✓ File created — Marc Dupont, Mediamax Agency',
            'demo-type': 'What type of project?',
            'demo-btn-web': 'Web app',
            'demo-btn-mobile': 'Mobile app',
            'demo-btn-ai': 'AI Agent',
            'demo-describe': 'Describe the need.',
            'demo-user-need': 'Automate our client proposals. Budget around 15k, delivery 3 months.',
            'demo-confirm': 'Got it! Budget $15,000, delivery 3 months. Canadian hosting required?',
            'demo-btn-yes': 'Yes',
            'demo-btn-no': 'No',
            'demo-generating': 'Generating your proposal...',
            'demo-ready': '✓ Proposal ready!',
            'demo-file-name': 'Proposal_AIAgent.pdf',
            'demo-approve-ask': 'Approve sending to marc@mediamax.ca?',
            'demo-btn-approve': '✓ Approved — send',
            'demo-btn-edit': 'Edit',
            'demo-sent': '✉️ Proposal sent to marc@mediamax.ca!',
            'onboard-welcome': 'Welcome! Let\'s set up your workspace.',
            'onboard-company': 'Your company name?',
            'onboard-user-company': 'Mediamax Agency',
            'onboard-company-ok': '✓ Workspace created — Mediamax Agency',
            'onboard-sector': 'Your industry?',
            'onboard-btn-consulting': 'Consulting',
            'onboard-btn-agency': 'Agency',
            'onboard-btn-construction': 'Construction',
            'onboard-services': 'What services do you offer?',
            'onboard-user-services': 'Web development, UI/UX Design, AI Agents',
            'onboard-services-ok': '✓ 3 services added to your catalog.',
            'onboard-import': 'Import a past proposal to calibrate the AI?',
            'onboard-btn-import': '📄 Import',
            'onboard-btn-skip': 'Skip',
            'onboard-file': 'Proposal_Redesign_2025.pdf',
            'onboard-import-ok': '✓ Proposal analyzed — tone, structure and pricing integrated!',
            'onboard-ready': '✓ Your workspace is ready! You can now generate proposals.',
        }
    };

    // Persona data for right-side detail
    const personaData = {
        fr: [
            { num: '01.01', title: 'Consultants & Freelances', desc: 'Travaillent seuls, temps limité pour rédiger des propositions convaincantes.' },
            { num: '01.02', title: 'Agences & PME', desc: 'Volume élevé de soumissions, besoin de standardiser la qualité.' },
            { num: '01.03', title: 'Construction', desc: 'Propositions techniques complexes avec devis détaillés et délais stricts.' }
        ],
        en: [
            { num: '01.01', title: 'Consultants & Freelancers', desc: 'Working alone, limited time to draft convincing proposals.' },
            { num: '01.02', title: 'Agencies & SMBs', desc: 'High volume of submissions, need to standardize quality.' },
            { num: '01.03', title: 'Construction', desc: 'Complex technical proposals with detailed quotes and strict timelines.' }
        ]
    };

    // ── Dynamic brand header ──
    const dynamicBrand = document.getElementById('dynamicBrand');
    dynamicBrand.addEventListener('click', () => {
        dynamicBrand.classList.remove('brand-hint');
        if (currentSlide !== 0) {
            currentSlide = 0;
            updateSlider();
        }
    });
    function updateBrand() {
        const t = translations[isEnglish ? 'en' : 'fr'];
        const msg = t['brand'][currentSlide] || t['brand'][0];
        dynamicBrand.style.opacity = '0';
        setTimeout(() => {
            dynamicBrand.textContent = msg;
            dynamicBrand.style.opacity = '1';
        }, 300);
    }

    // ── Translate page ──
    function translatePage() {
        const t = translations[isEnglish ? 'en' : 'fr'];
        document.querySelectorAll('[class*="t-"]').forEach(el => {
            const classes = [...el.classList];
            const tClass = classes.find(c => c.startsWith('t-'));
            if (tClass) {
                const key = tClass.substring(2);
                if (t[key] && typeof t[key] === 'string') {
                    el.innerHTML = t[key];
                }
            }
        });
        // Update tickers
        [['tickerTrack', 'ticker-1'], ['tickerTrack2', 'ticker-2']].forEach(([id, key]) => {
            const track = document.getElementById(id);
            if (track && t[key]) {
                track.innerHTML = [...t[key], ...t[key]].map(w =>
                    `<span class="ticker-item">${w}</span>`
                ).join('');
            }
        });
        langToggle.textContent = isEnglish ? 'FR' : 'EN';
        fsToggle.textContent = t['fs'];
        updatePersonaDetail(currentPersona);
        updateBrand();
    }

    // ── Persona carousel ──
    function startPersonaCarousel() {
        stopPersonaCarousel();
        personaInterval = setInterval(() => {
            currentPersona = (currentPersona + 1) % 3;
            updatePersonaCarousel();
        }, 3000);
    }

    function stopPersonaCarousel() {
        if (personaInterval) { clearInterval(personaInterval); personaInterval = null; }
    }

    function updatePersonaCarousel() {
        document.querySelectorAll('.persona-card').forEach((card, i) => {
            card.classList.toggle('active-persona', i === currentPersona);
        });
        document.querySelectorAll('.persona-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentPersona);
        });
        updatePersonaDetail(currentPersona);
    }

    function updatePersonaDetail(index) {
        const lang = isEnglish ? 'en' : 'fr';
        const data = personaData[lang][index];
        const detail = document.getElementById('personaDetail');
        if (!detail) return;
        detail.querySelector('.detail-num').textContent = data.num;
        detail.querySelector('.detail-title').textContent = data.title;
        detail.querySelector('.detail-desc').textContent = data.desc;
    }

    // ── Problem Slide Animations ──
    function animatePainScreen() {
        const clock = document.getElementById('painClock');
        const mStat1 = document.getElementById('mStat1');
        const mStat2 = document.getElementById('mStat2');
        const mStat3 = document.getElementById('mStat3');

        let seconds = 0;
        const target = 3587; // 00:59:47
        const duration = 3000; // 3 seconds to reach target
        const interval = 50; // update every 50ms
        const totalSteps = duration / interval;
        let step = 0;

        // Reset states
        clearInterval(painClockInterval);
        if (mStat1) mStat1.classList.remove('visible');
        if (mStat2) mStat2.classList.remove('visible');
        if (mStat3) mStat3.classList.remove('visible');

        // Update clock display
        function updateClock() {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            clock.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        updateClock();

        painClockInterval = setInterval(() => {
            step++;
            // Tick sound every 5 steps (accelerating feel)
            if (step % 5 === 0) pitchAudio.tick();
            // Ease-out curve: fast start, slows down near the end
            const progress = 1 - Math.pow(1 - (step / totalSteps), 3);
            seconds = Math.floor(progress * target);

            // Reveal stats at key moments during the acceleration
            if (step === 16 && mStat1) { mStat1.classList.add('visible'); pitchAudio.pop(); }
            if (step === 36 && mStat2) { mStat2.classList.add('visible'); pitchAudio.pop(); }
            if (step === 51 && mStat3) { mStat3.classList.add('visible'); pitchAudio.pop(); }

            if (step >= totalSteps) {
                seconds = target;
                clearInterval(painClockInterval);
                // Dramatic pause: disable next for 2s after all stats visible
                nextBtn.classList.add('paused');
                setTimeout(() => nextBtn.classList.remove('paused'), 2000);
            }

            updateClock();
        }, interval);
    }

    function stopPainClock() {
        if (painClockInterval) { clearInterval(painClockInterval); painClockInterval = null; }
    }

    // ── Demo Chat ──
    const solutionChatMessages = document.getElementById('solutionChatMessages');

    function getDemoSequence() {
        const t = translations[isEnglish ? 'en' : 'fr'];
        return [
            { type: 'ai', text: t['demo-greet'], delay: 600 },
            { type: 'buttons', options: [t['demo-btn-new'], t['demo-btn-followup']], select: 0, delay: 200 },
            { type: 'select', delay: 1400 },
            { type: 'ai', text: t['demo-name'], delay: 1000 },
            { type: 'user', text: t['demo-user-name'], delay: 1400 },
            { type: 'ai', text: t['demo-email'], delay: 1000 },
            { type: 'user', text: t['demo-user-email'], delay: 1400 },
            { type: 'ai', text: t['demo-file-created'], delay: 1000 },
            { type: 'ai', text: t['demo-type'], delay: 1000 },
            { type: 'buttons', options: [t['demo-btn-web'], t['demo-btn-mobile'], t['demo-btn-ai']], select: 2, delay: 200 },
            { type: 'select', delay: 1400 },
            { type: 'ai', text: t['demo-describe'], delay: 1000 },
            { type: 'user', text: t['demo-user-need'], delay: 1800 },
            { type: 'ai', text: t['demo-confirm'], delay: 1000 },
            { type: 'buttons', options: [t['demo-btn-yes'], t['demo-btn-no']], select: 0, delay: 200 },
            { type: 'select', delay: 1400 },
            { type: 'ai', text: t['demo-generating'], delay: 1000 },
            { type: 'ai', text: t['demo-ready'], delay: 1800 },
            { type: 'file', text: t['demo-file-name'], delay: 200 },
            { type: 'ai', text: t['demo-approve-ask'], delay: 1400 },
            { type: 'buttons', options: [t['demo-btn-approve'], t['demo-btn-edit']], select: 0, delay: 200 },
            { type: 'select', delay: 1400 },
            { type: 'ai', text: t['demo-sent'], delay: 1000 },
        ];
    }

    function playChatSequence(container, sequence, timeoutsArr, onComplete) {
        let cumulativeDelay = 0;
        let btnGroup = null;

        function scrollChat() {
            container.scrollTop = container.scrollHeight;
        }

        function addTyping() {
            const typing = document.createElement('div');
            typing.className = 'demo-typing';
            typing.innerHTML = '<span></span><span></span><span></span>';
            typing.dataset.typing = '1';
            container.appendChild(typing);
            scrollChat();
        }

        function removeTyping() {
            const typing = container.querySelector('[data-typing]');
            if (typing) typing.remove();
        }

        sequence.forEach((step, i) => {
            cumulativeDelay += step.delay;
            const timeout = setTimeout(() => {
                if (step.type === 'ai') {
                    removeTyping();
                    const msg = document.createElement('div');
                    msg.className = 'demo-msg demo-msg-ai';
                    if (step.text && step.text.startsWith('✓')) msg.classList.add('demo-msg-success');
                    msg.textContent = step.text;
                    container.appendChild(msg);
                    scrollChat();
                    const next = sequence[i + 1];
                    if (next && (next.type === 'ai' || next.type === 'file') && next.delay > 800) {
                        const tid = setTimeout(addTyping, 400);
                        timeoutsArr.push(tid);
                    }
                } else if (step.type === 'user') {
                    const msg = document.createElement('div');
                    msg.className = 'demo-msg demo-msg-user';
                    msg.textContent = step.text;
                    container.appendChild(msg);
                    scrollChat();
                    const tid = setTimeout(addTyping, 400);
                    timeoutsArr.push(tid);
                } else if (step.type === 'buttons') {
                    const group = document.createElement('div');
                    group.className = 'demo-btn-group';
                    group.dataset.selectIndex = step.select;
                    step.options.forEach(label => {
                        const btn = document.createElement('span');
                        btn.className = 'demo-btn';
                        btn.textContent = label;
                        group.appendChild(btn);
                    });
                    container.appendChild(group);
                    btnGroup = group;
                    scrollChat();
                } else if (step.type === 'select') {
                    if (btnGroup) {
                        const idx = parseInt(btnGroup.dataset.selectIndex);
                        const btns = btnGroup.querySelectorAll('.demo-btn');
                        btns.forEach((btn, j) => {
                            if (j === idx) btn.classList.add('selected');
                            else btn.classList.add('fade-out');
                        });
                        btnGroup = null;
                        const tid = setTimeout(addTyping, 400);
                        timeoutsArr.push(tid);
                    }
                } else if (step.type === 'file') {
                    removeTyping();
                    const file = document.createElement('div');
                    file.className = 'demo-file';
                    file.innerHTML = '<span class="demo-file-icon">📄</span>' + step.text;
                    container.appendChild(file);
                    scrollChat();
                }
            }, cumulativeDelay);
            timeoutsArr.push(timeout);
        });

        if (onComplete) {
            cumulativeDelay += 2000;
            const tid = setTimeout(onComplete, cumulativeDelay);
            timeoutsArr.push(tid);
        }
    }

    function playDemoChat(container, onComplete) {
        playChatSequence(container, getDemoSequence(), demoTimeouts, onComplete);
    }

    function stopDemoChat() {
        demoTimeouts.forEach(t => clearTimeout(t));
        demoTimeouts = [];
        solutionChatMessages.innerHTML = '';
    }

    // ── Onboarding Chat ──
    const onboardMessages = document.getElementById('onboardMessages');
    const onboardModal = document.getElementById('onboardModal');
    const onboardClose = document.getElementById('onboardClose');

    function getOnboardSequence() {
        const t = translations[isEnglish ? 'en' : 'fr'];
        return [
            { type: 'ai', text: t['onboard-welcome'], delay: 800 },
            { type: 'ai', text: t['onboard-company'], delay: 1500 },
            { type: 'user', text: t['onboard-user-company'], delay: 2000 },
            { type: 'ai', text: t['onboard-company-ok'], delay: 1500 },
            { type: 'ai', text: t['onboard-sector'], delay: 1500 },
            { type: 'buttons', options: [t['onboard-btn-consulting'], t['onboard-btn-agency'], t['onboard-btn-construction']], select: 1, delay: 300 },
            { type: 'select', delay: 2000 },
            { type: 'ai', text: t['onboard-services'], delay: 1500 },
            { type: 'user', text: t['onboard-user-services'], delay: 2500 },
            { type: 'ai', text: t['onboard-services-ok'], delay: 1500 },
            { type: 'ai', text: t['onboard-import'], delay: 1500 },
            { type: 'buttons', options: [t['onboard-btn-import'], t['onboard-btn-skip']], select: 0, delay: 300 },
            { type: 'select', delay: 2000 },
            { type: 'file', text: t['onboard-file'], delay: 300 },
            { type: 'ai', text: t['onboard-import-ok'], delay: 1500 },
            { type: 'ai', text: t['onboard-ready'], delay: 1500 },
        ];
    }

    function openOnboardModal() {
        onboardMessages.innerHTML = '';
        onboardModal.classList.add('active');
        const typing = document.createElement('div');
        typing.className = 'demo-typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        typing.dataset.typing = '1';
        onboardMessages.appendChild(typing);
        playChatSequence(onboardMessages, getOnboardSequence(), onboardTimeouts, null);
    }

    function closeOnboardModal() {
        onboardModal.classList.remove('active');
        onboardTimeouts.forEach(t => clearTimeout(t));
        onboardTimeouts = [];
        onboardMessages.innerHTML = '';
    }

    onboardClose.addEventListener('click', closeOnboardModal);
    onboardModal.addEventListener('click', (e) => {
        if (e.target === onboardModal) closeOnboardModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && onboardModal.classList.contains('active')) closeOnboardModal();
    });

    // ── Particle celebration ──
    let particleAnimId = null;
    function startParticles() {
        stopParticles();
        const canvas = document.getElementById('finaleCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const W = canvas.offsetWidth;
        const H = canvas.offsetHeight;

        const particles = [];
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: W * 0.3 + Math.random() * W * 0.4,
                y: H + Math.random() * 40,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -(1.5 + Math.random() * 3),
                size: 2 + Math.random() * 4,
                opacity: 0.3 + Math.random() * 0.7,
                hue: Math.random() > 0.5 ? 220 : 260, // blue or purple
                life: 0,
                maxLife: 120 + Math.random() * 100
            });
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            let alive = false;
            particles.forEach(p => {
                p.life++;
                if (p.life > p.maxLife) return;
                alive = true;
                p.x += p.vx + Math.sin(p.life * 0.03) * 0.5;
                p.y += p.vy;
                p.vy *= 0.995;
                const fade = 1 - (p.life / p.maxLife);
                const alpha = p.opacity * fade;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha})`;
                ctx.fill();
                // Glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * fade * 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha * 0.15})`;
                ctx.fill();
            });
            if (alive) {
                particleAnimId = requestAnimationFrame(draw);
            }
        }
        // Stagger particle spawns
        particles.forEach((p, i) => {
            p.y = H + 20;
            p.life = -i * 2; // negative = delayed start
        });
        draw();
    }

    function stopParticles() {
        if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; }
        const canvas = document.getElementById('finaleCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // ── Solution phases ──
    function setSolutionPhase(phase) {
        solutionPhases.forEach(p => slideSolution.classList.remove('phase-' + p));
        if (phase >= 0 && phase < solutionPhases.length) {
            slideSolution.classList.add('phase-' + solutionPhases[phase]);
        }
        solutionPhase = phase;
        lockNav(solutionPhases[phase] === 'reveal' ? 2000 : 800);

        // Reset
        stopDemoChat();
        stopParticles();
        const solVid = document.getElementById('solutionVideo');
        if (solVid) { solVid.pause(); solVid.currentTime = 0; }
        blackoutTimeouts.forEach(id => clearTimeout(id));
        blackoutTimeouts = [];
        slideSolution.classList.remove('phase-blackout');
        finaleBrand.classList.remove('visible');
        finaleCta.classList.remove('visible');

        // Disable fullscreen glow during reveal
        if (solutionPhases[phase] === 'reveal') {
            fsToggle.classList.remove('fs-glow');
        }

        switch (solutionPhases[phase]) {
            case 'chat':
                // Add typing indicator then start chat
                const typing = document.createElement('div');
                typing.className = 'demo-typing';
                typing.innerHTML = '<span></span><span></span><span></span>';
                typing.dataset.typing = '1';
                solutionChatMessages.appendChild(typing);
                playDemoChat(solutionChatMessages, () => {
                    setSolutionPhase(1); // auto-advance to video
                    updateNavState();
                });
                break;
            case 'video':
                // Play dictation video in the phone screen
                if (solVid) {
                    solVid.currentTime = 0;
                    solVid.play().catch(() => {});
                }
                break;
            case 'reveal':
                // Flash burst
                revealFlash.classList.add('flash');
                setTimeout(() => revealFlash.classList.remove('flash'), 500);

                // Reveal sound
                pitchAudio.reveal();

                // Play the cinematic reveal video
                const revealVid = document.querySelector('.finale-video');
                if (revealVid) {
                    revealVid.currentTime = 0;
                    revealVid.play().catch(() => {});
                }
                setTimeout(startParticles, 800);

                // Elastic bounce on finale-time
                const finaleTime = document.getElementById('finaleTime');
                if (finaleTime) {
                    finaleTime.style.animation = 'elastic-in 0.8s var(--ease-out-expo) forwards';
                }

                // Branding reveal after 2s
                setTimeout(() => {
                    finaleBrand.classList.add('visible');
                }, 2000);

                // CTA reveal after 3s
                setTimeout(() => {
                    finaleCta.classList.add('visible');
                }, 3000);

                // Hint: pulse the brand header to suggest going back
                setTimeout(() => {
                    dynamicBrand.classList.add('brand-hint');
                }, 4000);
                break;
        }
    }

    // ── Mobile phase system ──
    // On mobile (<=768px), slides 0 and 1 have sub-phases: 'title' then 'content'
    let mobilePhase = 'title'; // 'title' or 'content'
    function isMobile() { return window.innerWidth <= 768; }

    function setMobilePhase(phase) {
        mobilePhase = phase;
        const activeSlide = document.querySelectorAll('.slide')[currentSlide];
        activeSlide.classList.remove('mobile-phase-title', 'mobile-phase-content');
        activeSlide.classList.add('mobile-phase-' + phase);
    }

    // ── Navigation ──
    function lockNav(duration) { navLocked = true; setTimeout(() => navLocked = false, duration || 600); }

    function goNext() {
        if (navLocked) return;
        lockNav();
        // Mobile sub-phases for slides 0 and 1 only (slide 2 has its own phase system)
        if (isMobile() && currentSlide < 2 && mobilePhase === 'title') {
            setMobilePhase('content');
            updateNavState();
            return;
        }

        // Mobile: slide 2 title phase → show content then start solution phases
        if (isMobile() && currentSlide === 2 && mobilePhase === 'title') {
            setMobilePhase('content');
            setSolutionPhase(0);
            updateNavState();
            return;
        }

        if (currentSlide === 2) {
            if (solutionPhase < solutionPhases.length - 1) {
                setSolutionPhase(solutionPhase + 1);
                updateNavState();
                return;
            }
            return;
        }
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            updateSlider();
            // On desktop, start solution phases immediately
            if (currentSlide === 2 && !isMobile()) {
                setSolutionPhase(0);
            }
        }
    }

    function goPrev() {
        if (navLocked) return;
        lockNav();
        // Mobile sub-phases: go back to title first (slides 0 and 1)
        if (isMobile() && currentSlide < 2 && mobilePhase === 'content') {
            setMobilePhase('title');
            updateNavState();
            return;
        }

        // Mobile: slide 2, at phase 0 content → go back to title
        if (isMobile() && currentSlide === 2 && solutionPhase <= 0 && mobilePhase === 'content') {
            setMobilePhase('title');
            solutionPhase = -1;
            solutionPhases.forEach(p => slideSolution.classList.remove('phase-' + p));
            stopDemoChat();
            updateNavState();
            return;
        }

        if (currentSlide === 2 && solutionPhase > 0) {
            setSolutionPhase(solutionPhase - 1);
            updateNavState();
            return;
        }
        if (currentSlide > 0) {
            if (currentSlide === 2) {
                solutionPhase = -1;
                solutionPhases.forEach(p => slideSolution.classList.remove('phase-' + p));
                stopDemoChat();
            }
            currentSlide--;
            updateSlider();
        }
    }

    // ── Video management ──
    const allVideos = document.querySelectorAll('.iphone-video');

    function manageVideos() {
        const activeSlide = document.querySelectorAll('.slide')[currentSlide];
        allVideos.forEach(v => {
            if (!activeSlide || !activeSlide.contains(v)) {
                v.pause();
            }
        });
        const vid = activeSlide ? activeSlide.querySelector('.iphone-video') : null;
        if (vid) {
            vid.currentTime = 0;
            vid.play().catch(() => {});
        }
    }

    // Ensure videos play even when autoplay doesn't re-trigger (cached page load)
    allVideos.forEach(v => {
        v.addEventListener('canplay', () => {
            if (v.paused && v.autoplay) v.play().catch(() => {});
        });
    });

    // window.load fires after resources are ready (unlike DOMContentLoaded)
    window.addEventListener('load', () => {
        allVideos.forEach(v => {
            if (v.paused) v.play().catch(() => {});
        });
        manageVideos();
    });

    // Handle page restored from bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            allVideos.forEach(v => v.play().catch(() => {}));
            manageVideos();
        }
    });

    function updateSlider() {
        slider.style.transform = `translateX(-${currentSlide * 100}vw)`;
        document.querySelectorAll('.slide').forEach((s, i) => {
            s.classList.toggle('active', i === currentSlide);
            s.classList.remove('mobile-phase-title', 'mobile-phase-content');
        });

        // On mobile, new slides start with title phase
        if (isMobile() && currentSlide < 3) {
            mobilePhase = 'title';
            setMobilePhase('title');
        }

        // Update dynamic brand header
        updateBrand();

        // Slide transition sound
        pitchAudio.whoosh(false);

        // Slide-specific logic
        stopPainClock();
        stopPersonaCarousel();
        manageVideos();

        // Reset finale brand/CTA visibility when leaving slide 2
        if (currentSlide !== 2) {
            finaleBrand.classList.remove('visible');
            finaleCta.classList.remove('visible');
        }

        if (currentSlide === 0) {
            currentPersona = 0;
            updatePersonaCarousel();
            startPersonaCarousel();
        } else if (currentSlide === 1) {
            animatePainScreen();
        }

        updateNavState();
    }

    function updateNavState() {
        // On mobile, prev is only disabled at slide 0 title phase
        if (isMobile()) {
            prevBtn.disabled = (currentSlide === 0 && mobilePhase === 'title');
        } else {
            prevBtn.disabled = (currentSlide === 0);
        }
        nextBtn.disabled = (currentSlide === 2 && solutionPhase >= solutionPhases.length - 1);

        let progress;
        if (currentSlide < 2) {
            progress = ((currentSlide + 1) / totalSlides) * 100;
        } else {
            const base = (2 / totalSlides) * 100;
            const phaseProgress = ((solutionPhase + 1) / solutionPhases.length) * (100 / totalSlides);
            progress = base + phaseProgress;
        }
        progressFill.style.width = progress + '%';
    }

    // ── Keyboard navigation ──
    document.addEventListener('keydown', (e) => {
        if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
            e.preventDefault(); goNext();
        } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
            e.preventDefault(); goPrev();
        } else if (e.key === 'f' || e.key === 'F') {
            toggleFullscreen();
        }
    });

    // ── Mouse wheel (debounced) ──
    let isScrolling = false;
    document.addEventListener('wheel', (e) => {
        if (window.innerWidth <= 768) return;
        if (isScrolling) return;
        isScrolling = true;
        if (e.deltaY > 50) goNext();
        else if (e.deltaY < -50) goPrev();
        setTimeout(() => { isScrolling = false; }, 900);
    });

    // ── Button clicks ──
    prevBtn.onclick = goPrev;
    nextBtn.onclick = goNext;

    // ── Touch swipe (mobile) ──
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        const dy = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0) goNext();
        else goPrev();
    }, { passive: true });

    // ── Language toggle ──
    langToggle.addEventListener('click', () => {
        isEnglish = !isEnglish;
        translatePage();
    });

    // ── Fullscreen toggle ──
    fsToggle.classList.add('fs-glow');
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            fsToggle.classList.remove('fs-glow');
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }
    fsToggle.addEventListener('click', toggleFullscreen);

    // ── Resize handler ──
    window.addEventListener('resize', () => {
        if (isMobile()) {
            if (!document.querySelector('.slide.mobile-phase-title, .slide.mobile-phase-content')) {
                setMobilePhase('title');
            }
        }
    });

    // ── Custom cursor (throttled with rAF) ──
    if (window.innerWidth > 768) {
        let cursorRaf = null;
        document.addEventListener('mousemove', (e) => {
            if (cursorRaf) return;
            cursorRaf = requestAnimationFrame(() => {
                customCursor.style.left = e.clientX + 'px';
                customCursor.style.top = e.clientY + 'px';
                cursorRaf = null;
            });
        });
        document.querySelectorAll('button, a, .nav-btn, .lang-toggle, .fs-toggle').forEach(el => {
            el.addEventListener('mouseenter', () => customCursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => customCursor.classList.remove('hover'));
        });
    }

    // ── Cinematic opening ──
    function cinematicOpen() {
        // Animate kinetic lines on slide 1
        setTimeout(() => {
            document.querySelectorAll('#slide-cible .kinetic-line').forEach(line => {
                line.classList.add('animate-in');
            });
        }, 1800);

        // Lift curtain after 1.5s (no audio — requires user gesture)
        setTimeout(() => {
            cinematicCurtain.classList.add('lifted');
        }, 1500);

        // Hint: pulse next button after 3.5s so user knows to navigate
        setTimeout(() => {
            nextBtn.classList.add('hint-pulse');
            nextBtn.addEventListener('animationend', () => {
                nextBtn.classList.remove('hint-pulse');
            }, { once: true });
        }, 5000);
    }

    // ── CTA: Open onboarding demo ──
    finaleCta.addEventListener('click', openOnboardModal);

    // ── Init ──
    if (isMobile()) {
        setMobilePhase('title');
    }
    updatePersonaCarousel();
    updateNavState();
    startPersonaCarousel();
    manageVideos();
    cinematicOpen();
});


// ── Copyright Protection ──
// © 2026 JF Berthiaume. All Rights Reserved.
(function() {
    const _sig = 'AIPG-2026-JFB-7f3a9c2e-b4d1-4e8f-a5c3-9d6f2e1b8a7c';

    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable text selection
    document.addEventListener('selectstart', function(e) {
        // Allow selection in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        return false;
    });

    // Disable drag & drop on images and videos
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
            e.preventDefault();
            return false;
        }
    });

    // Disable keyboard shortcuts for viewing source / saving / dev tools
    document.addEventListener('keydown', function(e) {
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
        // Ctrl+S (Save)
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
        // Ctrl+Shift+I (Dev Tools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
        // Ctrl+Shift+C (Inspect Element)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); return false; }
        // F12 (Dev Tools)
        if (e.key === 'F12') { e.preventDefault(); return false; }
        // Ctrl+A (Select All)
        if (e.ctrlKey && e.key === 'a') { e.preventDefault(); return false; }
        // Ctrl+C (Copy) — except in inputs
        if (e.ctrlKey && e.key === 'c' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault(); return false;
        }
    });

    // Disable image/video download via overlay
    document.querySelectorAll('video').forEach(function(video) {
        video.setAttribute('controlsList', 'nodownload');
        video.setAttribute('disablePictureInPicture', '');
        video.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    });

    // Prevent saving images
    document.querySelectorAll('img').forEach(function(img) {
        img.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        img.setAttribute('draggable', 'false');
    });

    // Add CSS protection
    var style = document.createElement('style');
    style.textContent = 'img, video { pointer-events: auto; -webkit-user-drag: none; user-drag: none; } body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }';
    document.head.appendChild(style);
})();
