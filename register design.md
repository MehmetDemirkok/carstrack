<!DOCTYPE html>

<html class="dark" lang="tr"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>CarsTrack - Kayıt Ol</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "primary-fixed-dim": "#d0bcff",
                    "outline-variant": "#49454f",
                    "on-tertiary-fixed": "#0c006b",
                    "on-secondary": "#003640",
                    "secondary-fixed-dim": "#4cd7f6",
                    "on-background": "#dfe2f1",
                    "tertiary-fixed-dim": "#c2c1ff",
                    "primary-fixed": "#e9ddff",
                    "background": "#0f131d",
                    "surface-dim": "#0f131d",
                    "on-secondary-fixed": "#001f26",
                    "secondary": "#4cd7f6",
                    "on-primary-fixed-variant": "#4d3d76",
                    "on-tertiary-fixed-variant": "#332dbc",
                    "surface-container-high": "#262a35",
                    "outline": "#948f9a",
                    "on-surface-variant": "#cac4d0",
                    "surface": "#0f131d",
                    "primary-container": "#d0bcff",
                    "inverse-on-surface": "#2c303b",
                    "inverse-primary": "#665590",
                    "surface-container-highest": "#313540",
                    "surface-container": "#1b1f2a",
                    "surface-bright": "#353944",
                    "primary": "#e9ddff",
                    "on-primary-container": "#594983",
                    "surface-variant": "#313540",
                    "on-tertiary": "#1800a7",
                    "tertiary-fixed": "#e2dfff",
                    "surface-tint": "#d0bcff",
                    "tertiary": "#e2e0ff",
                    "surface-container-lowest": "#0a0e18",
                    "inverse-surface": "#dfe2f1",
                    "error-container": "#93000a",
                    "on-error-container": "#ffdad6",
                    "surface-container-low": "#171b26",
                    "secondary-container": "#03b5d4",
                    "on-error": "#690005",
                    "on-secondary-fixed-variant": "#004e5c",
                    "error": "#ffb4ab",
                    "tertiary-container": "#c2c1ff",
                    "on-primary-fixed": "#210f48",
                    "on-primary": "#37265e",
                    "on-secondary-container": "#00424e",
                    "secondary-fixed": "#acedff",
                    "on-tertiary-container": "#403cc8",
                    "on-surface": "#dfe2f1"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "container-padding-desktop": "4rem",
                    "gutter": "24px",
                    "unit": "8px",
                    "split-panel-ratio": "45% 55%",
                    "container-padding-mobile": "1.5rem"
            },
            "fontFamily": {
                    "headline-md": ["Inter"],
                    "headline-lg-mobile": ["Inter"],
                    "body-md": ["Inter"],
                    "body-lg": ["Inter"],
                    "display-lg": ["Inter"],
                    "label-caps": ["Inter"],
                    "headline-lg": ["Inter"]
            },
            "fontSize": {
                    "headline-md": ["24px", {"lineHeight": "1.3", "fontWeight": "600"}],
                    "headline-lg-mobile": ["28px", {"lineHeight": "1.2", "fontWeight": "700"}],
                    "body-md": ["16px", {"lineHeight": "1.5", "fontWeight": "400"}],
                    "body-lg": ["18px", {"lineHeight": "1.6", "fontWeight": "400"}],
                    "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "800"}],
                    "label-caps": ["12px", {"lineHeight": "1", "letterSpacing": "0.1em", "fontWeight": "700"}],
                    "headline-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "700"}]
            }
          },
        },
      }
    </script>
<style>
        body {
            background-color: #0f131d;
            font-family: 'Inter', sans-serif;
            color: #dfe2f1;
            overflow-x: hidden;
        }
        .glass-card {
            background: rgba(27, 31, 42, 0.6);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(148, 143, 154, 0.2);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
        }
        .glow-purple {
            box-shadow: 0 0 20px rgba(208, 188, 255, 0.3);
        }
        .glow-cyan {
            box-shadow: 0 0 20px rgba(76, 215, 246, 0.3);
        }
        .radar-animation {
            background: radial-gradient(circle, rgba(76, 215, 246, 0.1) 0%, transparent 70%);
            animation: pulse 4s infinite ease-in-out;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
        .grid-overlay {
            background-image: radial-gradient(rgba(208, 188, 255, 0.05) 1px, transparent 1px);
            background-size: 32px 32px;
        }
        .gradient-text-purple {
            background: linear-gradient(135deg, #d0bcff 0%, #e2e0ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
    </style>
</head>
<body class="min-h-screen grid-overlay">
<main class="flex min-h-screen flex-col lg:flex-row">
<!-- Left Column: Visuals & Stats -->
<section class="hidden lg:flex lg:w-[35%] flex-col justify-between p-12 relative overflow-hidden border-r border-outline-variant/20">
<div class="absolute inset-0 radar-animation -z-10"></div>
<div class="z-10">
<div class="text-primary font-black text-headline-md mb-2">CarsTrack</div>
<div class="h-1 w-12 bg-secondary rounded-full"></div>
</div>
<div class="relative z-10 space-y-6">
<!-- Stats Cards -->
<div class="glass-card p-6 rounded-xl border-l-4 border-secondary transform hover:translate-x-2 transition-transform">
<div class="font-label-caps text-label-caps text-secondary mb-1">AKTİF FİLO</div>
<div class="font-headline-lg text-headline-lg text-on-surface">247 ARAÇ</div>
</div>
<div class="glass-card p-6 rounded-xl border-l-4 border-primary transform hover:translate-x-2 transition-transform">
<div class="font-label-caps text-label-caps text-primary mb-1">UPTIME ORANI</div>
<div class="font-headline-lg text-headline-lg text-on-surface">99.2%</div>
</div>
<div class="glass-card p-6 rounded-xl border-l-4 border-tertiary-fixed-dim transform hover:translate-x-2 transition-transform">
<div class="font-label-caps text-label-caps text-tertiary-fixed-dim mb-1">GÜVENLİK</div>
<div class="font-headline-lg text-headline-lg text-on-surface">7/24 TAKİP</div>
</div>
</div>
<div class="z-10">
<p class="font-body-md text-on-surface-variant max-w-xs leading-relaxed">
                    Yapay zeka destekli lojistik yönetimi ile operasyonel maliyetlerinizi %30'a kadar azaltın.
                </p>
</div>
</section>
<!-- Middle Column: Registration Form -->
<section class="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-surface-dim/80 backdrop-blur-sm">
<div class="w-full max-w-md">
<!-- Header -->
<header class="mb-10 text-center lg:text-left">
<h1 class="font-headline-lg text-headline-lg text-on-surface mb-2">Sisteme Kayıt Ol</h1>
<p class="font-body-md text-on-surface-variant">Filo takip sistemine erişim için hesap oluşturun.</p>
</header>
<!-- Progress -->
<div class="mb-8">
<div class="flex justify-between items-end mb-2">
<span class="font-label-caps text-label-caps text-primary-fixed-dim">ADIM 1 / 2</span>
<span class="font-label-caps text-label-caps text-on-surface-variant">TEMEL BİLGİLER</span>
</div>
<div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
<div class="h-full w-1/2 bg-primary-container glow-purple transition-all duration-700"></div>
</div>
</div>
<!-- Action Toggle -->
<div class="flex gap-4 mb-8">
<button class="flex-1 py-3 px-4 rounded-xl bg-primary-container text-on-primary-container font-bold text-body-md glow-purple transition-all active:scale-95">
                        Şirket Kur
                    </button>
<button class="flex-1 py-3 px-4 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-body-md hover:bg-surface-variant/30 transition-all active:scale-95">
                        Şirkete Katıl
                    </button>
</div>
<!-- Form -->
<form class="space-y-5" onsubmit="event.preventDefault();">
<div class="space-y-2">
<label class="font-label-caps text-label-caps text-on-surface-variant px-1">ŞİRKET / FİLO ADI</label>
<div class="relative">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">business</span>
<input class="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 pl-12 pr-4 text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none" placeholder="ABC Lojistik" type="text"/>
</div>
</div>
<div class="space-y-2">
<label class="font-label-caps text-label-caps text-on-surface-variant px-1">AD SOYAD</label>
<div class="relative">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">person</span>
<input class="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 pl-12 pr-4 text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none" placeholder="Ahmet Yılmaz" type="text"/>
</div>
</div>
<div class="space-y-2">
<label class="font-label-caps text-label-caps text-on-surface-variant px-1">E-POSTA</label>
<div class="relative">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">mail</span>
<input class="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 pl-12 pr-4 text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none" placeholder="yonetici@sirket.com" type="email"/>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="space-y-2">
<label class="font-label-caps text-label-caps text-on-surface-variant px-1">ŞİFRE</label>
<div class="relative">
<span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant cursor-pointer hover:text-secondary">visibility</span>
<input class="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 px-4 text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none" placeholder="••••••••" type="password"/>
</div>
</div>
<div class="space-y-2">
<label class="font-label-caps text-label-caps text-on-surface-variant px-1">TEKRAR ŞİFRE</label>
<div class="relative">
<span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant cursor-pointer hover:text-secondary">visibility</span>
<input class="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 px-4 text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none" placeholder="••••••••" type="password"/>
</div>
</div>
</div>
<button class="w-full mt-6 py-4 px-6 rounded-xl bg-gradient-to-r from-[#d0bcff] to-[#4cd7f6] text-on-primary-fixed font-extrabold text-body-md flex items-center justify-center gap-2 glow-purple hover:opacity-90 active:scale-95 transition-all" type="submit">
                        HESAP OLUŞTUR
                        <span class="material-symbols-outlined">arrow_forward</span>
</button>
</form>
<footer class="mt-10 text-center">
<p class="font-body-md text-on-surface-variant">
                        Zaten hesabınız var mı? 
                        <a class="text-secondary font-bold hover:underline ml-1" href="#">Giriş yap</a>
</p>
</footer>
</div>
</section>
<!-- Right Column: Features & Social Proof -->
<section class="hidden xl:flex xl:w-[30%] flex-col justify-between p-12 bg-surface-container-lowest/50 border-l border-outline-variant/20 backdrop-blur-xl">
<div class="space-y-10">
<h3 class="font-headline-md text-headline-md text-on-surface">Neden CarsTrack?</h3>
<div class="space-y-8">
<!-- Feature 1 -->
<div class="flex gap-5">
<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
<span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">location_on</span>
</div>
<div>
<h4 class="font-body-md font-bold text-on-surface mb-1">Araç Takibi</h4>
<p class="font-body-md text-on-surface-variant text-sm">Gerçek zamanlı GPS ve rota optimizasyonu ile tam kontrol sağlayın.</p>
</div>
</div>
<!-- Feature 2 -->
<div class="flex gap-5">
<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
<span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">build</span>
</div>
<div>
<h4 class="font-body-md font-bold text-on-surface mb-1">Bakım Yönetimi</h4>
<p class="font-body-md text-on-surface-variant text-sm">Öngörücü bakım uyarıları ile beklenmedik duruşları minimize edin.</p>
</div>
</div>
<!-- Feature 3 -->
<div class="flex gap-5">
<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
<span class="material-symbols-outlined text-tertiary-fixed-dim" style="font-variation-settings: 'FILL' 1;">analytics</span>
</div>
<div>
<h4 class="font-body-md font-bold text-on-surface mb-1">Gelişmiş Analitik</h4>
<p class="font-body-md text-on-surface-variant text-sm">Yakıt tüketimi ve sürücü performansı üzerine derinlemesine raporlar.</p>
</div>
</div>
</div>
</div>
<!-- Social Proof -->
<div class="glass-card p-8 rounded-2xl relative overflow-hidden">
<div class="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-3xl"></div>
<div class="flex flex-col items-center text-center">
<div class="flex -space-x-3 mb-4">
<img class="w-10 h-10 rounded-full border-2 border-surface-dim" data-alt="Close-up portrait of a professional male fleet manager with glasses smiling confidently in a modern office environment, warm ambient lighting, high-quality corporate photography style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKVDYKOfYbYK440sn_koNqK4sA3zN41M6xHHWcNJSZdYXxHUppc1xDV0kmL2NsEFc41eCVP54ynNR_JErexRykHj2jfQDJsCMN0FhMoDKV6keVBzymmq8utpeXMdtpQzraBg_BNpTQi_xGNjpavdOB4i-CeI9VGL0JMe2RxOPB7aqmZsC2uV8IPJXgyHjHOu995chJV0LeQ4iTgayLWY7sKpVtNIDLQQSICLFXgNe5tebhS8l9mbTCsgw7Wn4yMAOoEUqY1C4W8jll"/>
<img class="w-10 h-10 rounded-full border-2 border-surface-dim" data-alt="Portrait of a female logistics coordinator in a high-tech control room, focused and professional expression, background with glowing data screens, modern digital aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHZYq58lEUPayXgl-CAsFXMhb7fY_OQBXO9Dna6ImNlxkYpHEngv16O7mTHZtq1SHY_D2UEteKZyu04Je2qwZ39wnJa-MvQKCc_GSo5JAZzUIAcJA-RIZW07QVK8c2UdXVoYxwU_YyjIiS_s-1CIapwYNId6dSnymlQtWf08VYi7WYoEFJP7Jy8994pqcRplqakneROfDc1LD9im61su9sf8glnt7K_R5gFRPQquqIYsAeFNCjmOIKmvVS1Y6nhncYcx4naFeP36_r"/>
<img class="w-10 h-10 rounded-full border-2 border-surface-dim" data-alt="Professional profile photo of an elderly male transport company owner, wise and friendly look, natural lighting, high-end business branding visual." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgspYGoHh-RMtA9LjjVliRC3a75hl_Ix13MnKctL1VfJ1eoqCIQTxg9UDXJxeC1lvc0Hmr-ZvF4_fSyWLr2nYnCtZTZzQtX-w1Z2pI2TxhPvZfaPrPHuJNd-vLH927Rz0YKRq8RkoAYWE2CqNZHWlbJTrpEwfSiPmQqMwOHNzyBQxpy_8y75_-WZb06m2MSYK9qCgKfUURXAPh-VmXKIUr1IVNmsCATKwJ-eeYJLzGto82u_DcL5BFM9TIs-K9sW53i0sh1MhEud6H"/>
<div class="w-10 h-10 rounded-full border-2 border-surface-dim bg-primary-container flex items-center justify-center text-[10px] font-bold text-on-primary-container">+49</div>
</div>
<div class="font-headline-md text-headline-md text-on-surface mb-1">500+</div>
<p class="font-label-caps text-label-caps text-on-surface-variant">ŞİRKET GÜVENİYOR</p>
</div>
</div>
</section>
</main>
<script>
        // Micro-interaction for input focus effects
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('glow-cyan');
            });
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('glow-cyan');
            });
        });

        // Simple toggle logic
        const toggleButtons = document.querySelectorAll('button.flex-1');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => {
                    b.classList.remove('bg-primary-container', 'text-on-primary-container', 'glow-purple');
                    b.classList.add('border', 'border-outline-variant', 'text-on-surface-variant');
                });
                btn.classList.add('bg-primary-container', 'text-on-primary-container', 'glow-purple');
                btn.classList.remove('border', 'border-outline-variant', 'text-on-surface-variant');
            });
        });
    </script>
</body></html>