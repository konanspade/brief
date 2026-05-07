(() => {
    const TOTAL_STEPS = 8;
    const STORAGE_KEY = 'ks-brand-brief';
    let currentStep = 0;
    let currentMode = 'general';

    const form = document.getElementById('questionnaire');
    const progressFill = document.getElementById('progressFill');
    const stepCurrentEl = document.getElementById('stepCurrent');
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const navFooter = document.getElementById('navFooter');
    const completion = document.getElementById('completion');
    const reviewContent = document.getElementById('reviewContent');
    const traitCount = document.getElementById('traitCount');

    const steps = form.querySelectorAll('.step');

    const sectionMaps = {
        general: [
            { title: 'Welcome', step: 0 },
            { title: 'Business Overview', step: 1 },
            { title: 'Target Audience', step: 2 },
            { title: 'Brand Personality', step: 3 },
            { title: 'Visual Direction', step: 4 },
            { title: 'Competitive Landscape', step: 5 },
            { title: 'Final Thoughts', step: 6 },
        ],
        lawfirm: [
            { title: 'Welcome', step: 0 },
            { title: 'Firm Overview', step: 1 },
            { title: 'Ideal Clients', step: 2 },
            { title: 'Brand Personality', step: 3 },
            { title: 'Visual Direction', step: 4 },
            { title: 'Competitive Landscape', step: 5 },
            { title: 'Final Thoughts', step: 6 },
        ],
    };

    const fieldLabels = {
        clientName: 'Name',
        clientEmail: 'Email',
        companyName: 'Company',
        industry: 'Industry',
        founded: 'Founded',
        website: 'Website',
        businessDesc: 'About',
        products: 'Products/Services',
        mission: 'Mission',
        idealCustomer: 'Ideal Customer',
        ageRange: 'Age Range',
        location: 'Market/Location',
        painPoints: 'Problems Solved',
        customerChannels: 'Online Channels',
        traits: 'Brand Traits',
        toneOfVoice: 'Tone of Voice',
        brandPerson: 'Brand as a Person',
        brandEmotion: 'Brand Emotions',
        visualStyles: 'Visual Styles',
        colorsLove: 'Color Preferences',
        brandsAdmire: 'Brands Admired',
        visualAvoid: 'Styles to Avoid',
        hasAssets: 'Existing Assets',
        competitor1: 'Competitor 1',
        competitor2: 'Competitor 2',
        competitor3: 'Competitor 3',
        competitorLike: 'Competitor Likes',
        competitorDislike: 'Competitor Dislikes',
        differentiation: 'Differentiation',
        practiceAreas: 'Practice Areas',
        firmSize: 'Firm Size',
        jurisdictions: 'Jurisdictions',
        keyServices: 'Key Services',
        clientType: 'Client Type',
        referralSources: 'Referral Sources',
        requirements: 'Requirements',
        anythingElse: 'Additional Notes',
    };

    const stepFieldsMap = {
        general: [
            ['clientName', 'clientEmail', 'companyName'],
            ['industry', 'founded', 'website', 'businessDesc', 'products', 'mission'],
            ['idealCustomer', 'ageRange', 'location', 'painPoints', 'customerChannels'],
            ['traits', 'toneOfVoice', 'brandPerson', 'brandEmotion'],
            ['visualStyles', 'colorsLove', 'brandsAdmire', 'visualAvoid', 'hasAssets'],
            ['competitor1', 'competitor2', 'competitor3', 'competitorLike', 'competitorDislike', 'differentiation'],
            ['requirements', 'anythingElse'],
        ],
        lawfirm: [
            ['clientName', 'clientEmail', 'companyName'],
            ['practiceAreas', 'firmSize', 'founded', 'jurisdictions', 'website', 'businessDesc', 'keyServices', 'mission'],
            ['idealCustomer', 'clientType', 'referralSources', 'painPoints'],
            ['traits', 'toneOfVoice', 'brandPerson', 'brandEmotion'],
            ['visualStyles', 'colorsLove', 'brandsAdmire', 'visualAvoid', 'hasAssets'],
            ['competitor1', 'competitor2', 'competitor3', 'competitorLike', 'competitorDislike', 'differentiation'],
            ['requirements', 'anythingElse'],
        ],
    };

    function setMode(mode) {
        currentMode = mode;
        document.body.className = `mode-${mode}`;
        document.querySelectorAll('.mode-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        saveData();
    }

    function init() {
        loadData();
        updateUI();
        bindEvents();
        updateTraitCount();
    }

    function bindEvents() {
        btnNext.addEventListener('click', handleNext);
        btnBack.addEventListener('click', handleBack);

        document.getElementById('modeToggle').addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-option');
            if (!btn || btn.dataset.mode === currentMode) return;
            setMode(btn.dataset.mode);
        });

        form.querySelectorAll('input[name="traits"]').forEach(cb => {
            cb.addEventListener('change', handleTraitChange);
        });

        form.querySelectorAll('input, textarea, select').forEach(el => {
            el.addEventListener('change', saveData);
            el.addEventListener('input', () => {
                if (el.classList.contains('invalid')) {
                    el.classList.remove('invalid');
                }
            });
        });

        document.getElementById('btnCopyBrief').addEventListener('click', () => {
            copyBrief();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                handleNext();
            }
        });
    }

    function handleNext() {
        if (currentStep === TOTAL_STEPS - 1) {
            submitBrief();
            return;
        }

        if (currentStep < TOTAL_STEPS - 1 && !validateStep(currentStep)) {
            return;
        }

        saveData();
        goToStep(currentStep + 1);
    }

    function handleBack() {
        if (currentStep > 0) {
            goToStep(currentStep - 1);
        }
    }

    function goToStep(target) {
        if (target === currentStep) return;

        const outgoing = steps[currentStep];
        const incoming = steps[target];

        outgoing.classList.remove('active');
        outgoing.classList.add('exit-up');

        setTimeout(() => {
            outgoing.classList.remove('exit-up');
        }, 500);

        currentStep = target;
        incoming.classList.add('active');

        if (target === TOTAL_STEPS - 1) {
            buildReview();
        }

        updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateUI() {
        const stepNum = String(currentStep + 1).padStart(2, '0');
        stepCurrentEl.textContent = stepNum;
        progressFill.style.width = `${((currentStep + 1) / TOTAL_STEPS) * 100}%`;

        btnBack.classList.toggle('hidden', currentStep === 0);

        if (currentStep === TOTAL_STEPS - 1) {
            btnNext.innerHTML = `Submit Brief <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
            btnNext.classList.add('submit-btn');
        } else {
            btnNext.innerHTML = `Continue <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`;
            btnNext.classList.remove('submit-btn');
        }
    }

    function validateStep(stepIndex) {
        const step = steps[stepIndex];
        const requiredInputs = step.querySelectorAll('[required]');
        let valid = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('invalid');
                valid = false;
            } else {
                input.classList.remove('invalid');
            }
        });

        if (stepIndex === 0) {
            const email = step.querySelector('[name="clientEmail"]');
            if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
                email.classList.add('invalid');
                valid = false;
            }
        }

        if (stepIndex === 3) {
            const checked = step.querySelectorAll('input[name="traits"]:checked');
            if (checked.length === 0) {
                valid = false;
                const grid = document.getElementById('traitsGrid');
                grid.style.outline = '2px solid var(--error)';
                grid.style.outlineOffset = '8px';
                grid.style.borderRadius = '8px';
                setTimeout(() => {
                    grid.style.outline = 'none';
                }, 2000);
            }
        }

        if (!valid) {
            const firstInvalid = step.querySelector('.invalid');
            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return valid;
    }

    function handleTraitChange() {
        const checked = form.querySelectorAll('input[name="traits"]:checked');
        const allTraits = form.querySelectorAll('.trait-chip');

        if (checked.length >= 5) {
            allTraits.forEach(chip => {
                if (!chip.querySelector('input').checked) {
                    chip.classList.add('disabled');
                    chip.querySelector('input').disabled = true;
                }
            });
        } else {
            allTraits.forEach(chip => {
                chip.classList.remove('disabled');
                chip.querySelector('input').disabled = false;
            });
        }

        updateTraitCount();
        saveData();
    }

    function updateTraitCount() {
        const checked = form.querySelectorAll('input[name="traits"]:checked');
        traitCount.textContent = `${checked.length} / 5 selected`;
    }

    function getFormData() {
        const data = {};
        const formData = new FormData(form);

        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        ['traits', 'visualStyles', 'colorsLove', 'practiceAreas', 'clientType'].forEach(name => {
            if (data[name] && !Array.isArray(data[name])) {
                data[name] = [data[name]];
            }
        });

        return data;
    }

    function saveData() {
        try {
            const data = getFormData();
            data._step = currentStep;
            data._mode = currentMode;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* silent */ }
    }

    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const data = JSON.parse(raw);

            if (data._mode) {
                setMode(data._mode);
            }

            Object.entries(data).forEach(([key, value]) => {
                if (key === '_step' || key === '_mode') return;

                if (Array.isArray(value)) {
                    value.forEach(v => {
                        const el = form.querySelector(`[name="${key}"][value="${v}"]`);
                        if (el && (el.type === 'checkbox' || el.type === 'radio')) {
                            el.checked = true;
                        }
                    });
                } else {
                    const el = form.querySelector(`[name="${key}"]`);
                    if (!el) return;
                    if (el.type === 'radio') {
                        const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                        if (radio) radio.checked = true;
                    } else {
                        el.value = value;
                    }
                }
            });

            if (data._step && data._step > 0 && data._step < TOTAL_STEPS) {
                steps[0].classList.remove('active');
                currentStep = data._step;
                steps[currentStep].classList.add('active');
            }
        } catch (e) { /* silent */ }
    }

    function getValue(name) {
        const data = getFormData();
        const val = data[name];
        if (!val) return '';
        if (Array.isArray(val)) return val.join(', ');
        return val;
    }

    function buildReview() {
        let html = '';
        const sectionMap = sectionMaps[currentMode];
        const stepFields = stepFieldsMap[currentMode];

        sectionMap.forEach((section, sectionIndex) => {
            const fields = stepFields[sectionIndex];
            let fieldsHtml = '';

            fields.forEach(fieldName => {
                const val = getValue(fieldName);
                const label = fieldLabels[fieldName] || fieldName;

                if (['traits', 'visualStyles', 'colorsLove', 'practiceAreas', 'clientType'].includes(fieldName) && val) {
                    const items = val.split(', ');
                    fieldsHtml += `
                        <div class="review-field">
                            <span class="review-label">${label}</span>
                            <div class="review-chips">${items.map(i => `<span class="review-chip">${i}</span>`).join('')}</div>
                        </div>`;
                } else {
                    fieldsHtml += `
                        <div class="review-field">
                            <span class="review-label">${label}</span>
                            <span class="review-value ${val ? '' : 'empty'}">${val || '-'}</span>
                        </div>`;
                }
            });

            html += `
                <div class="review-section">
                    <div class="review-section-header" data-goto="${section.step}">
                        <span class="review-section-title">${section.title}</span>
                        <button type="button" class="review-edit" data-goto="${section.step}">Edit</button>
                    </div>
                    <div class="review-fields">${fieldsHtml}</div>
                </div>`;
        });

        reviewContent.innerHTML = html;

        reviewContent.querySelectorAll('[data-goto]').forEach(el => {
            el.addEventListener('click', () => {
                goToStep(parseInt(el.dataset.goto));
            });
        });
    }

    function generateBriefText() {
        const data = getFormData();
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const divider = '─'.repeat(48);
        const isLaw = currentMode === 'lawfirm';

        const g = (key) => {
            const v = data[key];
            if (!v) return '-';
            return Array.isArray(v) ? v.join(', ') : v;
        };

        const businessSection = isLaw ? `
${divider}
  FIRM OVERVIEW
${divider}

Practice Areas:     ${g('practiceAreas')}
Firm Size:          ${g('firmSize')}
Established:        ${g('founded')}
Jurisdictions:      ${g('jurisdictions')}
Website:            ${g('website')}

About the Firm:
${g('businessDesc')}

Key Services:
${g('keyServices')}

Firm Philosophy:
${g('mission')}` : `
${divider}
  BUSINESS OVERVIEW
${divider}

Industry:           ${g('industry')}
Founded:            ${g('founded')}
Website:            ${g('website')}

About the Business:
${g('businessDesc')}

Products/Services:
${g('products')}

Mission/Vision:
${g('mission')}`;

        const audienceSection = isLaw ? `
${divider}
  IDEAL CLIENTS
${divider}

Ideal Client:
${g('idealCustomer')}

Client Type:        ${g('clientType')}
Referral Sources:   ${g('referralSources')}

What Clients Value:
${g('painPoints')}` : `
${divider}
  TARGET AUDIENCE
${divider}

Ideal Customer:
${g('idealCustomer')}

Age Range:          ${g('ageRange')}
Primary Market:     ${g('location')}

Problems Solved:
${g('painPoints')}

Online Channels:    ${g('customerChannels')}`;

        return `
${'═'.repeat(48)}
   BRAND DESIGN BRIEF${isLaw ? ' (LAW FIRM)' : ''}
   Prepared for Konan & Spade
${'═'.repeat(48)}

Client:    ${g('clientName')}
Email:     ${g('clientEmail')}
${isLaw ? 'Firm' : 'Company'}:   ${g('companyName')}
Date:      ${date}
${businessSection}
${audienceSection}

${divider}
  BRAND PERSONALITY
${divider}

Brand Traits:       ${g('traits')}
Tone of Voice:      ${g('toneOfVoice')}

Brand as a Person:
${g('brandPerson')}

Desired Emotions:
${g('brandEmotion')}

${divider}
  VISUAL DIRECTION
${divider}

Visual Styles:      ${g('visualStyles')}
Color Preferences:  ${g('colorsLove')}
Existing Assets:    ${g('hasAssets')}

Brands Admired:
${g('brandsAdmire')}

Styles to Avoid:
${g('visualAvoid')}

${divider}
  COMPETITIVE LANDSCAPE
${divider}

Competitors:        ${[g('competitor1'), g('competitor2'), g('competitor3')].filter(c => c !== '-').join(', ') || '-'}

What they do well:
${g('competitorLike')}

What they do poorly:
${g('competitorDislike')}

Differentiation:
${g('differentiation')}

${divider}
  ADDITIONAL NOTES
${divider}

Requirements:
${g('requirements')}

Additional Notes:
${g('anythingElse')}

${'═'.repeat(48)}
  Generated via Konan & Spade Brand Brief
${'═'.repeat(48)}
`.trim();
    }

    function copyBrief() {
        const text = generateBriefText();
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('btnCopyBrief');
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = original; }, 2000);
        });
    }

    async function submitBrief() {
        const briefText = generateBriefText();
        const formData = getFormData();
        const name = (formData.clientName || '').split(' ')[0] || 'there';

        // Show completion immediately
        form.style.display = 'none';
        navFooter.style.display = 'none';
        completion.classList.add('active');
        document.getElementById('completionText').textContent =
            `Thank you, ${name}. We've received your brand design brief and our team will review it shortly.`;

        // Copy to clipboard
        try { await navigator.clipboard.writeText(briefText); } catch (e) { /* silent */ }

        // Submit to backend
        try {
            await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData, briefText, mode: currentMode })
            });
        } catch (e) {
            console.error('Submit error:', e);
        }

        localStorage.removeItem(STORAGE_KEY);
    }

    init();
})();
