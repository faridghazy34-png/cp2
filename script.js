/**
 * BarHitung - Kalkulator Pintar NLP
 * Kalkulator dengan fitur Natural Language Processing
 * untuk menyelesaikan soal cerita matematika
 */

(function () {
    'use strict';

    // ===== Calculator State =====
    const state = {
        currentInput: '0',
        expression: '',
        lastOperator: '',
        lastNumber: '',
        resetOnNext: false,
        history: JSON.parse(localStorage.getItem('barhitung_history') || '[]'),
    };

    // ===== DOM References =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        result: $('#result'),
        expression: $('#expression'),
        buttonPad: $('#buttonPad'),
        tabBar: $('#tabBar'),
        tabIndicator: $('#tabIndicator'),
        historyBtn: $('#historyBtn'),
        historyModal: $('#historyModal'),
        historyList: $('#historyList'),
        modalClose: $('#modalClose'),
        clearHistory: $('#clearHistory'),
        chatArea: $('#chatArea'),
        nlpInput: $('#nlpInput'),
        sendBtn: $('#sendBtn'),
    };

    // ===== Tab System =====
    function initTabs() {
        const tabs = $$('.tab');
        const contents = $$('.tab-content');

        function setActiveTab(tabName) {
            tabs.forEach((tab) => tab.classList.remove('active'));
            contents.forEach((c) => c.classList.remove('active'));

            const activeTab = $(`[data-tab="${tabName}"]`);
            const activeContent = $(`#content${capitalize(tabName)}`);

            if (activeTab && activeContent) {
                activeTab.classList.add('active');
                activeContent.classList.add('active');
                updateIndicator(activeTab);
            }
        }

        function updateIndicator(tab) {
            els.tabIndicator.style.left = tab.offsetLeft + 'px';
            els.tabIndicator.style.width = tab.offsetWidth + 'px';
        }

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
        });

        // Init indicator position
        const activeTab = $('.tab.active');
        if (activeTab) updateIndicator(activeTab);

        window.addEventListener('resize', () => {
            const active = $('.tab.active');
            if (active) updateIndicator(active);
        });
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ===== Calculator Logic =====
    function updateDisplay() {
        els.result.textContent = state.currentInput;
        els.expression.textContent = state.expression;

        // Adjust font size for long numbers
        if (state.currentInput.length > 10) {
            els.result.classList.add('small');
        } else {
            els.result.classList.remove('small');
        }
    }

    function formatNumber(num) {
        if (isNaN(num) || !isFinite(num)) return 'Error';
        const str = num.toString();
        if (str.includes('e')) return str;

        const parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return parts.join(',');
    }

    function parseDisplay(str) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }

    function handleNumber(value) {
        if (state.resetOnNext) {
            state.currentInput = '';
            state.resetOnNext = false;
        }

        if (state.currentInput === '0' && value !== '00') {
            state.currentInput = value;
        } else if (state.currentInput === '0' && value === '00') {
            // Do nothing, keep 0
        } else {
            if (state.currentInput.replace(/[.,]/g, '').length >= 15) return;
            state.currentInput += value;
        }

        // Format while typing
        const hasDecimal = state.currentInput.includes(',');
        if (!hasDecimal) {
            const num = parseInt(state.currentInput.replace(/\./g, ''), 10);
            if (!isNaN(num)) {
                state.currentInput = num.toLocaleString('de-DE');
            }
        }

        updateDisplay();
    }

    function handleDecimal() {
        if (state.resetOnNext) {
            state.currentInput = '0';
            state.resetOnNext = false;
        }

        if (!state.currentInput.includes(',')) {
            state.currentInput += ',';
        }
        updateDisplay();
    }

    function handleOperator(op) {
        const currentNum = parseDisplay(state.currentInput);

        if (state.expression && !state.resetOnNext) {
            // Chain operation
            calculate();
        }

        state.expression = formatNumber(parseDisplay(state.currentInput)) + ' ' + op + ' ';
        state.lastOperator = op;
        state.lastNumber = state.currentInput;
        state.resetOnNext = true;
        updateDisplay();
    }

    function handlePercent() {
        const current = parseDisplay(state.currentInput);
        const result = current / 100;
        state.currentInput = formatNumber(result);
        updateDisplay();
    }

    function handleClear() {
        state.currentInput = '0';
        state.expression = '';
        state.lastOperator = '';
        state.lastNumber = '';
        state.resetOnNext = false;
        updateDisplay();
    }

    function handleBackspace() {
        if (state.resetOnNext) return;

        if (state.currentInput.length <= 1 || (state.currentInput.length === 2 && state.currentInput.startsWith('-'))) {
            state.currentInput = '0';
        } else {
            state.currentInput = state.currentInput.slice(0, -1);
            // Reformat
            if (!state.currentInput.includes(',')) {
                const cleaned = state.currentInput.replace(/\./g, '');
                const num = parseInt(cleaned, 10);
                if (!isNaN(num)) {
                    state.currentInput = num.toLocaleString('de-DE');
                }
            }
        }
        updateDisplay();
    }

    function calculate() {
        if (!state.expression || !state.lastOperator) return;

        const left = parseDisplay(state.lastNumber);
        const right = parseDisplay(state.currentInput);
        let result;

        switch (state.lastOperator) {
            case '+':
                result = left + right;
                break;
            case '-':
            case '−':
                result = left - right;
                break;
            case '×':
                result = left * right;
                break;
            case '÷':
                if (right === 0) {
                    state.currentInput = 'Error';
                    state.expression = '';
                    state.lastOperator = '';
                    state.resetOnNext = true;
                    updateDisplay();
                    return;
                }
                result = left / right;
                break;
            default:
                return;
        }

        // Round to avoid floating point issues
        result = Math.round(result * 1e10) / 1e10;

        const fullExpr = state.expression + formatNumber(right);
        const formattedResult = formatNumber(result);

        // Save to history
        addHistory(fullExpr, formattedResult);

        state.expression = '';
        state.currentInput = formattedResult;
        state.lastOperator = '';
        state.lastNumber = '';
        state.resetOnNext = true;
        updateDisplay();
    }

    // ===== Button Pad Events =====
    function initButtonPad() {
        els.buttonPad.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn');
            if (!btn) return;

            // Haptic feedback (vibrate if available)
            if (navigator.vibrate) navigator.vibrate(10);

            const action = btn.dataset.action;
            const value = btn.dataset.value;

            switch (action) {
                case 'number':
                    handleNumber(value);
                    break;
                case 'decimal':
                    handleDecimal();
                    break;
                case 'operator':
                    handleOperator(value);
                    break;
                case 'equals':
                    calculate();
                    break;
                case 'clear':
                    handleClear();
                    break;
                case 'backspace':
                    handleBackspace();
                    break;
                case 'percent':
                    handlePercent();
                    break;
            }
        });
    }

    // ===== Keyboard Support =====
    function initKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Only handle if calculator tab is active
            if (!$('#contentKalkulator').classList.contains('active')) return;
            // Don't interfere with input fields
            if (e.target.tagName === 'INPUT') return;

            const key = e.key;

            if (/^[0-9]$/.test(key)) {
                handleNumber(key);
            } else if (key === '.') {
                handleDecimal();
            } else if (key === '+') {
                handleOperator('+');
            } else if (key === '-') {
                handleOperator('-');
            } else if (key === '*') {
                handleOperator('×');
            } else if (key === '/') {
                e.preventDefault();
                handleOperator('÷');
            } else if (key === '%') {
                handlePercent();
            } else if (key === 'Enter' || key === '=') {
                calculate();
            } else if (key === 'Backspace') {
                handleBackspace();
            } else if (key === 'Escape' || key === 'Delete') {
                handleClear();
            }
        });
    }

    // ===== History =====
    function addHistory(expr, result) {
        state.history.unshift({ expr, result, time: Date.now() });
        if (state.history.length > 50) state.history.pop();
        localStorage.setItem('barhitung_history', JSON.stringify(state.history));
    }

    function renderHistory() {
        if (state.history.length === 0) {
            els.historyList.innerHTML = '<p class="empty-history">Belum ada riwayat</p>';
            return;
        }

        els.historyList.innerHTML = state.history
            .map(
                (item) => `
            <div class="history-item" data-expr="${item.expr}" data-result="${item.result}">
                <span class="history-expr">${item.expr}</span>
                <span class="history-result">= ${item.result}</span>
            </div>
        `
            )
            .join('');

        // Click to reuse
        $$('.history-item').forEach((item) => {
            item.addEventListener('click', () => {
                state.currentInput = item.dataset.result;
                state.expression = '';
                state.resetOnNext = true;
                updateDisplay();
                closeModal();
            });
        });
    }

    function initHistory() {
        els.historyBtn.addEventListener('click', () => {
            renderHistory();
            els.historyModal.classList.add('active');
        });

        els.modalClose.addEventListener('click', closeModal);

        els.historyModal.addEventListener('click', (e) => {
            if (e.target === els.historyModal) closeModal();
        });

        els.clearHistory.addEventListener('click', () => {
            state.history = [];
            localStorage.removeItem('barhitung_history');
            renderHistory();
        });
    }

    function closeModal() {
        els.historyModal.classList.remove('active');
    }

    // ===== NLP Engine: BarHitung =====
    const NLP = {
        // Pola percakapan / identitas
        conversationalPatterns: [
            {
                patterns: [/siapa\s*(nama\s*mu|namamu|nama\s*kamu|kamu)/i, /nama\s*(mu|kamu)\s*siapa/i, /kamu\s*siapa/i],
                response: 'Nama saya adalah **BarHitung**! 🤖 Saya adalah kalkulator pintar yang bisa membantu kamu menyelesaikan soal cerita matematika.',
            },
            {
                patterns: [/apa\s*(itu|kah)\s*barhitung/i, /barhitung\s*itu\s*apa/i],
                response: 'BarHitung adalah kalkulator pintar dengan teknologi NLP (Natural Language Processing) yang dapat memahami dan menyelesaikan soal cerita matematika dalam Bahasa Indonesia. 📖🧮',
            },
            {
                patterns: [/halo/i, /hai/i, /hello/i, /hi\b/i, /hey/i],
                response: 'Halo! 👋 Saya **BarHitung**, kalkulator pintar kamu. Silakan ketik soal cerita matematika, dan saya akan membantu menyelesaikannya!',
            },
            {
                patterns: [/terima\s*kasih/i, /makasih/i, /thanks/i, /thx/i],
                response: 'Sama-sama! 😊 Senang bisa membantu. Jika ada soal lain, silakan tanya lagi ya!',
            },
            {
                patterns: [/bisa\s*apa\s*(saja|aja)?/i, /fitur/i, /kamu\s*bisa\s*apa/i, /apa\s*yang\s*bisa\s*kamu/i],
                response: 'Saya **BarHitung** bisa:\n\n🧮 Menghitung operasi dasar (+, -, ×, ÷)\n📖 Menyelesaikan soal cerita matematika\n💬 Mengobrol ringan\n\nCoba ketik soal cerita seperti: "Ani punya 15 buku, dia memberikan 7 buku, berapa sisa buku Ani?"',
            },
            {
                patterns: [/apa\s*kabar/i, /kabar\s*(mu|kamu)/i],
                response: 'Kabar saya baik! 😄 Terima kasih sudah bertanya. Saya siap membantu kamu menghitung. Ada soal yang ingin diselesaikan?',
            },
            {
                patterns: [/siapa\s*(yang)?\s*(buat|membuat|cipta|menciptakan)\s*(mu|kamu)/i, /siapa\s*pembuat/i],
                response: 'Saya **BarHitung** dibuat menggunakan JavaScript murni dengan teknologi NLP sederhana. Saya dirancang untuk membantu menyelesaikan soal cerita matematika! 🚀',
            },
        ],

        // Kamus kata kunci operasi
        operationKeywords: {
            tambah: '+',
            ditambah: '+',
            menambah: '+',
            menambahkan: '+',
            penambahan: '+',
            'bertambah': '+',
            'mendapat': '+',
            'mendapatkan': '+',
            menerima: '+',
            membeli: '+',
            datang: '+',
            diberi: '+',
            diberikan: '+',
            'dapat': '+',
            plus: '+',
            jumlah: '+',
            total: '+',
            kurang: '-',
            dikurangi: '-',
            mengurangi: '-',
            pengurangan: '-',
            berkurang: '-',
            memberikan: '-',
            memberi: '-',
            membagikan: '-',
            kehilangan: '-',
            hilang: '-',
            memakan: '-',
            dimakan: '-',
            dijual: '-',
            menjual: '-',
            pergi: '-',
            minus: '-',
            diambil: '-',
            mengambil: '-',
            rusak: '-',
            pecah: '-',
            jatuh: '-',
            kali: '*',
            dikali: '*',
            dikalikan: '*',
            perkalian: '*',
            'masing-masing': '*',
            setiap: '*',
            tiap: '*',
            per: '*',
            bagi: '/',
            dibagi: '/',
            pembagian: '/',
            separuh: '/2',
            setengah: '/2',
            sepertiga: '/3',
        },

        // Kata unit / satuan
        unitWords: [
            'buah', 'biji', 'butir', 'ekor', 'orang', 'batang', 'lembar', 'helai',
            'potong', 'kotak', 'bungkus', 'gelas', 'cangkir', 'piring', 'mangkuk',
            'buku', 'pensil', 'pena', 'apel', 'jeruk', 'mangga', 'kelereng',
            'kue', 'roti', 'permen', 'coklat', 'mainan', 'boneka', 'mobil',
            'balon', 'bola', 'stiker', 'kursi', 'meja', 'tas', 'topi',
            'kg', 'gram', 'meter', 'cm', 'km', 'liter', 'ml',
            'rupiah', 'ribu', 'juta', 'hari', 'minggu', 'bulan', 'tahun',
            'jam', 'menit', 'detik',
        ],

        // Kata angka Indonesia
        numberWords: {
            nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
            enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
            sebelas: 11, duabelas: 12, tigabelas: 13, empatbelas: 14, limabelas: 15,
            enambelas: 16, tujuhbelas: 17, delapanbelas: 18, sembilanbelas: 19,
            duapuluh: 20, tigapuluh: 30, empatpuluh: 40, limapuluh: 50,
            enampuluh: 60, tujuhpuluh: 70, delapanpuluh: 80, sembilanpuluh: 90,
            seratus: 100, seribu: 1000, sejuta: 1000000,
        },

        // Utama: proses input
        process(input) {
            const text = input.trim().toLowerCase();

            // 1. Cek pola percakapan
            for (const conv of this.conversationalPatterns) {
                for (const pattern of conv.patterns) {
                    if (pattern.test(text)) {
                        return { type: 'conversation', response: conv.response };
                    }
                }
            }

            // 2. Cek apakah ekspresi matematika langsung
            const directResult = this.tryDirectMath(text);
            if (directResult !== null) {
                return {
                    type: 'math',
                    response: `Hasil perhitungannya adalah:`,
                    answer: directResult,
                    steps: [],
                };
            }

            // 3. Coba selesaikan soal cerita
            const storyResult = this.solveStory(text);
            if (storyResult) {
                return storyResult;
            }

            // 4. Fallback
            return {
                type: 'unknown',
                response: 'Maaf, saya belum bisa memahami soal tersebut. 🤔\n\nCoba gunakan format seperti:\n- "Ani punya 10 apel, dia memberikan 3 apel. Berapa sisa apel Ani?"\n- "5 kotak berisi masing-masing 12 pensil. Berapa total pensil?"',
            };
        },

        // Coba evaluasi ekspresi matematika langsung
        tryDirectMath(text) {
            // Clean up text, replace math symbols
            let expr = text
                .replace(/[×x]/g, '*')
                .replace(/[÷:]/g, '/')
                .replace(/berapa/gi, '')
                .replace(/hasil/gi, '')
                .replace(/dari/gi, '')
                .replace(/\?/g, '')
                .trim();

            // Check if it's a simple math expression
            if (/^[\d\s+\-*/().,%]+$/.test(expr)) {
                expr = expr.replace(/,/g, '.').replace(/%/g, '/100');
                try {
                    const result = Function('"use strict"; return (' + expr + ')')();
                    if (typeof result === 'number' && isFinite(result)) {
                        return Math.round(result * 1e10) / 1e10;
                    }
                } catch (e) { /* not a valid expression */ }
            }

            // Try word-based: "dua puluh tiga tambah empat belas"
            const wordResult = this.tryWordMath(text);
            return wordResult;
        },

        tryWordMath(text) {
            // Simple pattern: number operation number
            const opMap = {
                tambah: '+', plus: '+', ditambah: '+',
                kurang: '-', minus: '-', dikurangi: '-',
                kali: '*', dikali: '*', dikalikan: '*',
                bagi: '/', dibagi: '/',
            };

            for (const [word, op] of Object.entries(opMap)) {
                const regex = new RegExp(`(\\d+)\\s*${word}\\s*(\\d+)`, 'i');
                const match = text.match(regex);
                if (match) {
                    const a = parseFloat(match[1]);
                    const b = parseFloat(match[2]);
                    let result;
                    switch (op) {
                        case '+': result = a + b; break;
                        case '-': result = a - b; break;
                        case '*': result = a * b; break;
                        case '/': result = b !== 0 ? a / b : NaN; break;
                    }
                    if (!isNaN(result) && isFinite(result)) {
                        return Math.round(result * 1e10) / 1e10;
                    }
                }
            }
            return null;
        },

        // Soal cerita solver
        solveStory(text) {
            const numbers = this.extractNumbers(text);
            if (numbers.length < 2) return null;

            const operations = this.detectOperations(text);
            if (operations.length === 0) return null;

            const unit = this.detectUnit(text);
            const steps = [];
            let result = numbers[0].value;
            steps.push(`Angka awal: ${numbers[0].value}${unit ? ' ' + unit : ''}`);

            let opIndex = 0;
            for (let i = 1; i < numbers.length; i++) {
                const op = operations[Math.min(opIndex, operations.length - 1)];
                const num = numbers[i].value;
                const prevResult = result;

                switch (op) {
                    case '+':
                        result += num;
                        steps.push(`${prevResult} + ${num} = ${result}`);
                        break;
                    case '-':
                        result -= num;
                        steps.push(`${prevResult} - ${num} = ${result}`);
                        break;
                    case '*':
                        result *= num;
                        steps.push(`${prevResult} × ${num} = ${result}`);
                        break;
                    case '/':
                        if (num !== 0) {
                            result = result / num;
                            steps.push(`${prevResult} ÷ ${num} = ${result}`);
                        }
                        break;
                    case '/2':
                        result = result / 2;
                        steps.push(`${prevResult} ÷ 2 = ${result}`);
                        break;
                    case '/3':
                        result = result / 3;
                        steps.push(`${prevResult} ÷ 3 = ${result}`);
                        break;
                }
                opIndex++;
            }

            result = Math.round(result * 1e10) / 1e10;

            return {
                type: 'story',
                response: 'Saya akan menyelesaikan soal ini langkah demi langkah:',
                steps: steps,
                answer: result,
                unit: unit,
            };
        },

        // Extract numbers dari teks
        extractNumbers(text) {
            const numbers = [];

            // Angka numerik
            const numRegex = /\d+([.,]\d+)?/g;
            let match;
            while ((match = numRegex.exec(text)) !== null) {
                const val = parseFloat(match[0].replace(',', '.'));
                numbers.push({ value: val, index: match.index });
            }

            return numbers.sort((a, b) => a.index - b.index);
        },

        // Detect operations dari kata kunci
        detectOperations(text) {
            const operations = [];
            const words = text.split(/\s+/);

            for (const word of words) {
                const cleaned = word.replace(/[.,!?;:]/g, '');
                if (this.operationKeywords[cleaned]) {
                    let op = this.operationKeywords[cleaned];
                    // Handle special fractional operations
                    if (op === '/2' || op === '/3') {
                        operations.push(op);
                    } else {
                        operations.push(op);
                    }
                }
            }

            // Juga cek frasa
            if (text.includes('masing-masing') || text.match(/setiap|tiap/)) {
                if (!operations.includes('*')) operations.push('*');
            }

            return operations;
        },

        // Detect unit / satuan dari konteks pertanyaan
        detectUnit(text) {
            // Cari unit di bagian pertanyaan (setelah "berapa")
            const questionMatch = text.match(/berapa\s+(?:sisa\s+|total\s+|jumlah\s+|banyak\s+|banyaknya\s+)?(\w+)/i);
            if (questionMatch) {
                const word = questionMatch[1].toLowerCase();
                if (this.unitWords.includes(word)) return word;
            }

            // Cari unit yang muncul setelah angka pertama
            const afterNumberMatch = text.match(/\d+\s+(\w+)/);
            if (afterNumberMatch) {
                const word = afterNumberMatch[1].toLowerCase();
                if (this.unitWords.includes(word)) return word;
            }

            // Cari unit apapun yang ada di teks
            for (const unit of this.unitWords) {
                if (text.includes(unit)) return unit;
            }

            return '';
        },
    };

    // ===== Chat UI =====
    let welcomeRemoved = false;

    function addMessage(text, sender, extraHtml = '') {
        if (!welcomeRemoved) {
            const welcome = $('.chat-welcome');
            if (welcome) welcome.remove();
            welcomeRemoved = true;
        }

        const msg = document.createElement('div');
        msg.className = `chat-message ${sender}`;

        const avatarIcon = sender === 'bot' ? '🤖' : '👤';

        msg.innerHTML = `
            <div class="message-avatar">${avatarIcon}</div>
            <div class="message-bubble">${formatMessageText(text)}${extraHtml}</div>
        `;

        els.chatArea.appendChild(msg);
        scrollToBottom();
    }

    function formatMessageText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    function addTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'chat-message bot';
        typing.id = 'typingIndicator';
        typing.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        els.chatArea.appendChild(typing);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const typing = $('#typingIndicator');
        if (typing) typing.remove();
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            els.chatArea.scrollTop = els.chatArea.scrollHeight;
        });
    }

    function processNLPInput() {
        const input = els.nlpInput.value.trim();
        if (!input) return;

        // Add user message
        addMessage(input, 'user');
        els.nlpInput.value = '';

        // Show typing indicator
        addTypingIndicator();

        // Process with delay for natural feel
        setTimeout(() => {
            removeTypingIndicator();

            const result = NLP.process(input);

            switch (result.type) {
                case 'conversation':
                    addMessage(result.response, 'bot');
                    break;

                case 'math':
                    addMessage(result.response, 'bot',
                        `<div class="answer-highlight">${formatNumber_NLP(result.answer)}</div>`
                    );
                    break;

                case 'story': {
                    let stepsHtml = '<div class="solution-steps">';
                    stepsHtml += '<p><strong>📝 Langkah penyelesaian:</strong></p>';
                    result.steps.forEach((step, i) => {
                        stepsHtml += `<p>${i + 1}. ${step}</p>`;
                    });
                    stepsHtml += '</div>';
                    stepsHtml += `<div class="answer-highlight">Jawaban: ${formatNumber_NLP(result.answer)}${result.unit ? ' ' + result.unit : ''}</div>`;

                    addMessage(result.response, 'bot', stepsHtml);
                    break;
                }

                case 'unknown':
                    addMessage(result.response, 'bot');
                    break;
            }
        }, 800 + Math.random() * 500);
    }

    function formatNumber_NLP(num) {
        if (Number.isInteger(num)) return num.toLocaleString('id-ID');
        return num.toLocaleString('id-ID', { maximumFractionDigits: 4 });
    }

    function initNLP() {
        els.sendBtn.addEventListener('click', processNLPInput);
        els.nlpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') processNLPInput();
        });

        // Example chips
        $$('.chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                els.nlpInput.value = chip.dataset.example;
                processNLPInput();
            });
        });
    }

    // ===== Init Everything =====
    function init() {
        initTabs();
        initButtonPad();
        initKeyboard();
        initHistory();
        initNLP();
        updateDisplay();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
