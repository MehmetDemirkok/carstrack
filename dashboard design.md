<!-- Dashboard Redesign - Desktop -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>CarsTrack | Fleet Management Dashboard</title>
<!-- Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@500&amp;family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@100..900&amp;family=Inter:wght@100..900&amp;family=JetBrains+Mono:wght@100..900&amp;display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "secondary-fixed-dim": "#4edea3",
                    "secondary": "#006c49",
                    "background": "#faf8ff",
                    "on-background": "#131b2e",
                    "tertiary-fixed": "#e1e0ff",
                    "primary-container": "#2563eb",
                    "on-secondary": "#ffffff",
                    "on-tertiary-container": "#f1eeff",
                    "surface-container-highest": "#dae2fd",
                    "on-secondary-container": "#00714d",
                    "on-primary": "#ffffff",
                    "inverse-surface": "#283044",
                    "error": "#ba1a1a",
                    "primary-fixed-dim": "#b4c5ff",
                    "surface": "#faf8ff",
                    "outline-variant": "#c3c6d7",
                    "tertiary-fixed-dim": "#c0c1ff",
                    "on-primary-fixed-variant": "#003ea8",
                    "tertiary-container": "#585be6",
                    "tertiary": "#3e3fcc",
                    "on-error": "#ffffff",
                    "on-tertiary-fixed-variant": "#2f2ebe",
                    "on-surface": "#131b2e",
                    "on-secondary-fixed": "#002113",
                    "surface-dim": "#d2d9f4",
                    "secondary-container": "#6cf8bb",
                    "primary": "#004ac6",
                    "on-tertiary": "#ffffff",
                    "inverse-on-surface": "#eef0ff",
                    "on-secondary-fixed-variant": "#005236",
                    "primary-fixed": "#dbe1ff",
                    "surface-bright": "#faf8ff",
                    "on-tertiary-fixed": "#07006c",
                    "surface-container-lowest": "#ffffff",
                    "secondary-fixed": "#6ffbbe",
                    "surface-container": "#eaedff",
                    "on-primary-fixed": "#00174b",
                    "on-surface-variant": "#434655",
                    "outline": "#737686",
                    "surface-container-high": "#e2e7ff",
                    "error-container": "#ffdad6",
                    "surface-tint": "#0053db",
                    "surface-variant": "#dae2fd",
                    "surface-container-low": "#f2f3ff",
                    "on-primary-container": "#eeefff",
                    "on-error-container": "#93000a",
                    "inverse-primary": "#b4c5ff"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "base": "8px",
                    "gutter": "16px",
                    "container-margin-mobile": "16px",
                    "container-margin-desktop": "32px",
                    "touch-target-min": "44px"
            },
            "fontFamily": {
                    "label-caps": ["JetBrains Mono"],
                    "headline-lg": ["Hanken Grotesk"],
                    "body-lg": ["Inter"],
                    "title-md": ["Hanken Grotesk"],
                    "display-lg": ["Hanken Grotesk"],
                    "body-sm": ["Inter"],
                    "headline-lg-mobile": ["Hanken Grotesk"]
            },
            "fontSize": {
                    "label-caps": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "500"}],
                    "headline-lg": ["32px", {"lineHeight": "40px", "fontWeight": "600"}],
                    "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
                    "title-md": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
                    "display-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                    "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                    "headline-lg-mobile": ["24px", {"lineHeight": "32px", "fontWeight": "600"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    </style>
</head>
<body class="bg-background text-on-background font-body-lg overflow-hidden">
<div class="flex h-screen w-full">
<!-- Sidebar Navigation -->
<aside class="hidden md:flex flex-col w-64 bg-surface-container-low border-r border-outline-variant h-full shrink-0">
<div class="p-6 flex items-center gap-3">
<div class="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white">
<span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">directions_car</span>
</div>
<div>
<h1 class="font-headline-lg-mobile text-headline-lg-mobile font-bold tracking-tight text-primary">CarsTrack</h1>
<p class="text-[10px] font-label-caps text-on-surface-variant">FLEET MANAGEMENT SYSTEM</p>
</div>
</div>
<nav class="mt-4 px-4 flex-grow space-y-1">
<a class="flex items-center gap-3 px-4 py-3 bg-secondary-container text-on-secondary-container rounded-xl transition-all scale-95 duration-150" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">dashboard</span>
<span class="font-title-md text-body-lg">Dashboard</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors" href="#">
<span class="material-symbols-outlined">directions_car</span>
<span class="font-title-md text-body-lg">Vehicles</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors" href="#">
<span class="material-symbols-outlined">assignment</span>
<span class="font-title-md text-body-lg">Tasks</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors" href="#">
<span class="material-symbols-outlined">build</span>
<span class="font-title-md text-body-lg">Maintenance</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors" href="#">
<span class="material-symbols-outlined">group</span>
<span class="font-title-md text-body-lg">Team</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors" href="#">
<span class="material-symbols-outlined">history</span>
<span class="font-title-md text-body-lg">Service History</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors" href="#">
<span class="material-symbols-outlined">analytics</span>
<span class="font-title-md text-body-lg">Fleet Status</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="font-title-md text-body-lg">Settings</span>
</a>
</nav>
<div class="p-4 mt-auto">
<div class="bg-surface-container-high rounded-2xl p-4 flex items-center gap-3">
<img alt="Mehmet Demirkök Profile" class="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVHkof-RCFH3Bgdr3G5JQANyZ1ceup3JOZPqoqvII5q0Vy9hFKcmmCqOjflTX2vz4vNDJK90MCQ44K0djFxlF40pD0yGAH9VEIvKR-KxP0V5x7gB0OcQdL-yhBbNMd4K6smgk2y_BFrt8msz7n6bvK7uyaAWa1Am8AFUn6Qh40HnHvXpxQruIz_lGo9AJp2g0u2VJbmvuc-rsnTT7hYoqwIbwpJscdE6ZrbAwF8QKcekKMCq_Nst6rhNL7iqWPRchUqAd2Y4Pvijf1"/>
<div class="overflow-hidden">
<p class="text-on-surface font-semibold text-body-sm truncate">Mehmet Demirkök</p>
<p class="text-[10px] text-on-surface-variant truncate">SSTEK A.Ş. ADMIN</p>
</div>
<button class="ml-auto text-on-surface-variant hover:text-primary">
<span class="material-symbols-outlined">logout</span>
</button>
</div>
</div>
</aside>
<!-- Main Content -->
<main class="flex-1 flex flex-col min-w-0 overflow-hidden">
<!-- Top App Bar -->
<header class="flex justify-between items-center px-container-margin-desktop h-touch-target-min w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-md">
<div class="flex items-center gap-4 flex-1">
<div class="relative max-w-md w-full">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input class="w-full pl-10 pr-4 py-2 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary text-body-sm" placeholder="Search vehicles, tasks, or service..." type="text"/>
<span class="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded border border-outline-variant text-[10px] font-label-caps text-outline">⌘K</span>
</div>
</div>
<div class="flex items-center gap-3">
<button class="p-2 hover:bg-surface-variant/50 rounded-full transition-all active:scale-95">
<span class="material-symbols-outlined">light_mode</span>
</button>
<button class="p-2 hover:bg-surface-variant/50 rounded-full transition-all active:scale-95 relative">
<span class="material-symbols-outlined">notifications</span>
<span class="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
</button>
<div class="h-8 w-px bg-outline-variant mx-2"></div>
<div class="flex items-center gap-2">
<div class="text-right hidden sm:block">
<p class="text-[10px] text-on-surface-variant font-label-caps">GOOD EVENING</p>
<p class="text-body-sm font-bold text-on-surface">Mehmet Demirkök</p>
</div>
</div>
</div>
</header>
<!-- Dashboard Content -->
<section class="flex-1 overflow-y-auto p-container-margin-desktop custom-scrollbar space-y-8">
<!-- Hero Bento Grid: Health Score & Distribution -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
<!-- Score Card -->
<div class="lg:col-span-2 relative overflow-hidden rounded-[2rem] h-64 shadow-xl group">

<div class="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-12">
<div class="flex gap-12 items-center">
<div class="relative">
<svg class="w-32 h-32 transform -rotate-90">
<circle class="text-white/20" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" stroke-width="12"></circle>
<circle class="text-secondary-fixed" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" stroke-dasharray="364.4" stroke-dashoffset="0" stroke-width="12"></circle>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center">
<span class="font-display-lg text-display-lg text-white">100</span>
<span class="text-[10px] font-label-caps text-white/70">/100</span>
</div>
</div>
<div>
<h2 class="font-headline-lg text-headline-lg text-white mb-1">Fleet Health Score</h2>
<p class="text-white/80 max-w-xs font-body-lg">Your fleet is operating at peak efficiency. All major systems are currently synchronized.</p>
<div class="flex gap-4 mt-6">
<span class="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white text-[10px] font-label-caps flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
                                            EXCELLENT CONDITION
                                        </span>
</div>
</div>
</div>
</div>
<!-- Decorative element -->
<div class="absolute right-12 top-1/2 -translate-y-1/2 opacity-20 group-hover:scale-110 transition-transform duration-700">
<span class="material-symbols-outlined text-[120px] text-white" style="font-variation-settings: 'FILL' 1;">stars</span>
</div>
</div>
<!-- Distribution Card -->
<div class="bg-surface-container-low rounded-[2rem] p-8 flex flex-col justify-between border border-outline-variant shadow-sm">
<div class="flex items-center justify-between mb-4">
<h3 class="font-title-md text-on-surface uppercase tracking-wider text-sm font-bold">Health Distribution</h3>
<span class="text-[10px] font-label-caps text-on-surface-variant">WEIGHTED AVG</span>
</div>
<div class="space-y-6">
<div class="space-y-2">
<div class="flex justify-between items-center text-body-sm">
<span class="flex items-center gap-2 font-medium"><span class="material-symbols-outlined text-lg text-primary">security</span> Insurance</span>
<span class="font-label-caps font-bold">100/100</span>
</div>
<div class="w-full bg-surface-container-highest rounded-full h-3">
<div class="bg-secondary-fixed-dim h-3 rounded-full shadow-inner" style="width: 100%"></div>
</div>
</div>
<div class="space-y-2">
<div class="flex justify-between items-center text-body-sm">
<span class="flex items-center gap-2 font-medium"><span class="material-symbols-outlined text-lg text-primary">analytics</span> Inspection</span>
<span class="font-label-caps font-bold">100/100</span>
</div>
<div class="w-full bg-surface-container-highest rounded-full h-3">
<div class="bg-secondary-fixed-dim h-3 rounded-full shadow-inner" style="width: 100%"></div>
</div>
</div>
<div class="space-y-2">
<div class="flex justify-between items-center text-body-sm">
<span class="flex items-center gap-2 font-medium"><span class="material-symbols-outlined text-lg text-primary">build</span> Maintenance</span>
<span class="font-label-caps font-bold">100/100</span>
</div>
<div class="w-full bg-surface-container-highest rounded-full h-3">
<div class="bg-secondary-fixed-dim h-3 rounded-full shadow-inner" style="width: 100%"></div>
</div>
</div>
</div>
</div>
</div>
<!-- Secondary Row: Risk Distribution & Quick Stats -->
<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
<div class="lg:col-span-2 bg-surface-container-low border border-outline-variant rounded-[1.5rem] p-6">
<div class="flex justify-between items-center mb-6">
<h3 class="font-title-md text-on-surface font-bold">Fleet Risk Analysis</h3>
<button class="text-primary font-label-caps text-xs flex items-center gap-1 hover:underline">VIEW DETAIL <span class="material-symbols-outlined text-xs">arrow_forward</span></button>
</div>
<div class="flex flex-col md:flex-row items-center gap-8">
<div class="relative w-32 h-32 shrink-0">
<svg class="w-full h-full transform -rotate-90" viewbox="0 0 36 36">
<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22c55e" stroke-dasharray="100, 100" stroke-width="3"></path>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center">
<span class="text-xl font-bold text-on-surface">Safe</span>
<span class="text-[10px] text-on-surface-variant font-label-caps">100%</span>
</div>
</div>
<div class="flex-1 bg-secondary-container/20 border border-secondary-container rounded-2xl p-4 flex items-center gap-4">
<div class="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white shrink-0">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">check_circle</span>
</div>
<p class="text-body-sm text-on-secondary-container">Your fleet is currently in <strong class="font-bold">Perfect Standing</strong>. No high-risk vehicles or urgent maintenance alerts detected in the last 24 hours.</p>
</div>
</div>
</div>
<div class="grid grid-cols-3 gap-4 lg:col-span-2">
<div class="bg-surface-container rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center group hover:bg-primary hover:text-white transition-all duration-300">
<span class="material-symbols-outlined text-3xl mb-2 text-primary group-hover:text-white">directions_car</span>
<span class="text-2xl font-bold block">05</span>
<span class="text-[10px] font-label-caps text-on-surface-variant group-hover:text-white/80">VEHICLES</span>
</div>
<div class="bg-surface-container rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center group hover:bg-error hover:text-white transition-all duration-300">
<span class="material-symbols-outlined text-3xl mb-2 text-error group-hover:text-white">report_problem</span>
<span class="text-2xl font-bold block text-error group-hover:text-white">00</span>
<span class="text-[10px] font-label-caps text-on-surface-variant group-hover:text-white/80">ALERTS</span>
</div>
<div class="bg-surface-container rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center group hover:bg-secondary-fixed-dim hover:text-on-secondary-container transition-all duration-300">
<span class="material-symbols-outlined text-3xl mb-2 text-secondary-fixed-dim group-hover:text-on-secondary-container">engineering</span>
<span class="text-2xl font-bold block text-secondary">11</span>
<span class="text-[10px] font-label-caps text-on-surface-variant group-hover:text-on-secondary-container/80">SERVICES</span>
</div>
</div>
</div>
<!-- Main Grid: Vehicles & Service List -->
<div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
<!-- My Vehicles Section -->
<div class="xl:col-span-2 space-y-4">
<div class="flex justify-between items-center px-2">
<h3 class="font-headline-lg-mobile text-on-surface font-bold">Active Fleet Status</h3>
<button class="text-primary font-label-caps text-xs flex items-center gap-1">VIEW ALL FLEET <span class="material-symbols-outlined text-sm">keyboard_arrow_right</span></button>
</div>
<!-- Vehicle Cards -->
<div class="space-y-4">
<!-- Vehicle 1 -->
<div class="bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden hover:shadow-md transition-all flex h-44">
<div class="w-1/3 relative shrink-0">
<img class="w-full h-full object-cover" data-alt="A clean, professional studio photograph of a modern luxury black sedan like an Audi A6, parked in a minimalist showroom with soft, directional lighting and sharp reflections. The atmosphere is sophisticated and clean, emphasizing technical perfection and vehicle maintenance quality." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2oziu06QAG1KsHeZt7ib52jQzxezbe_JEjluotqEsES5JCFBEi4ffDMPuPn5iFQBRaiHhBTsUjBDQcshBTeex52rwIeGC3b-xueZbk-G3m6bzUHiJ_UYD9ntNdd_u_DZ-ITyt-kRGPxKtvI8WLvDNJDJqBtAanxLQmVb72uvUmS0MGtYUPu6tYE82OHAXIBLszOdCcUP2Jz519yrryQl0MoUqM3pj-_ureuVvL7jJGQIDBzgZpLQES1l6sJ47HMq_crqZ1NnyFbsA"/>
<div class="absolute top-2 left-2 bg-secondary text-white text-[10px] font-label-caps px-2 py-0.5 rounded-full">AVAILABLE</div>
</div>
<div class="flex-1 p-6 flex flex-col justify-between">
<div class="flex justify-between items-start">
<div>
<h4 class="font-label-caps text-lg font-bold text-on-surface">06 FLV 373</h4>
<p class="text-body-sm text-on-surface-variant">Audi A6 • 2025 Model</p>
</div>
<div class="text-right">
<span class="text-2xl font-bold text-secondary">100</span>
<span class="text-[10px] font-label-caps text-on-surface-variant block">HEALTH</span>
</div>
</div>
<div class="space-y-3">
<div class="flex justify-between text-[11px] font-label-caps text-on-surface-variant">
<span>MILEAGE: 36,450 km</span>
<span>COLOR: BLACK METALLIC</span>
</div>
<div class="w-full bg-surface-container rounded-full h-2 overflow-hidden">
<div class="bg-secondary-fixed-dim h-full" style="width: 100%"></div>
</div>
</div>
</div>
</div>
<!-- Vehicle 2 -->
<div class="bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden hover:shadow-md transition-all flex h-44">
<div class="w-1/3 relative shrink-0">
<img class="w-full h-full object-cover" data-alt="A high-end automotive photograph of a sleek dark blue sedan, similar to an Audi A4, captured during golden hour. The vehicle's metallic surface gleams under warm sunlight, parked on a clean asphalt surface. Professional lighting emphasizes its curves and high-performance engineering aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEgT27tQyvNwto5kewjPbv6LgRiA90DImO_t21UZDZSjugeTeDKRLI8jFCXYYKGAspKS3jqOlywgJeQSnBLWsX7E8sSpL-S0ECkJW0tiUSFr6lGFsLHtWETw9qTkJWEIxabuivy5Uar2zVoYE9pJexnq0qCbmNJocXgAKhJyX3b6s0Vm5PatVi-ggZ6ZV75jKoEV2RdPzh7IK7jn7TD5UTINW2NWZCYBR91jvovXf0daTP2sTYY4n6aviKpM_Bj7tAVir_R6RQJfsk"/>
<div class="absolute top-2 left-2 bg-secondary text-white text-[10px] font-label-caps px-2 py-0.5 rounded-full">AVAILABLE</div>
</div>
<div class="flex-1 p-6 flex flex-col justify-between">
<div class="flex justify-between items-start">
<div>
<h4 class="font-label-caps text-lg font-bold text-on-surface">06 DJP 784</h4>
<p class="text-body-sm text-on-surface-variant">Audi A4 • 2022 Model</p>
</div>
<div class="text-right">
<span class="text-2xl font-bold text-secondary">100</span>
<span class="text-[10px] font-label-caps text-on-surface-variant block">HEALTH</span>
</div>
</div>
<div class="space-y-3">
<div class="flex justify-between text-[11px] font-label-caps text-on-surface-variant">
<span>MILEAGE: 105,575 km</span>
<span>COLOR: DEEP BLUE</span>
</div>
<div class="w-full bg-surface-container rounded-full h-2 overflow-hidden">
<div class="bg-secondary-fixed-dim h-full" style="width: 100%"></div>
</div>
</div>
</div>
</div>
</div>
</div>
<!-- Recent Service Log Section -->
<div class="space-y-4">
<div class="flex justify-between items-center px-2">
<h3 class="font-headline-lg-mobile text-on-surface font-bold">Recent Service</h3>
<button class="text-primary font-label-caps text-xs flex items-center gap-1">FULL LOGS <span class="material-symbols-outlined text-sm">open_in_new</span></button>
</div>
<div class="bg-surface-container-low border border-outline-variant rounded-2xl p-6 space-y-6">
<div class="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-8 before:bottom-[-16px] before:w-px before:bg-outline-variant">
<div class="absolute left-0 top-0 w-6 h-6 bg-primary-container rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-white text-sm" style="font-variation-settings: 'FILL' 1;">build</span>
</div>
<div class="flex justify-between items-start mb-1">
<h5 class="font-bold text-on-surface text-body-sm">Lower Plastic Grill Replacement</h5>
<span class="text-[10px] font-label-caps text-on-surface-variant">TODAY</span>
</div>
<p class="text-[11px] text-on-surface-variant leading-relaxed">Vehicle 06 DJP 784 • Maintenance successfully completed. Parts quality certified.</p>
<p class="mt-2 text-[10px] font-label-caps font-bold text-primary">105,575 KM RECORDED</p>
</div>
<div class="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-8 before:bottom-[-16px] before:w-px before:bg-outline-variant">
<div class="absolute left-0 top-0 w-6 h-6 bg-tertiary-container rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-white text-sm" style="font-variation-settings: 'FILL' 1;">visibility</span>
</div>
<div class="flex justify-between items-start mb-1">
<h5 class="font-bold text-on-surface text-body-sm">Window Tint Installation</h5>
<span class="text-[10px] font-label-caps text-on-surface-variant">YESTERDAY</span>
</div>
<p class="text-[11px] text-on-surface-variant leading-relaxed">Vehicle 34 PPS 111 • Cosmetic upgrade finalized. UV protection layer applied.</p>
<p class="mt-2 text-[10px] font-label-caps font-bold text-primary">75 KM RECORDED</p>
</div>
<div class="relative pl-8">
<div class="absolute left-0 top-0 w-6 h-6 bg-secondary-container rounded-full flex items-center justify-center">
<span class="material-symbols-outlined text-on-secondary-container text-sm" style="font-variation-settings: 'FILL' 1;">rocket_launch</span>
</div>
<div class="flex justify-between items-start mb-1">
<h5 class="font-bold text-on-surface text-body-sm">New Fleet Acquisition</h5>
<span class="text-[10px] font-label-caps text-on-surface-variant">JUN 12</span>
</div>
<p class="text-[11px] text-on-surface-variant leading-relaxed">Vehicle 34 PPS 111 • Initial delivery inspection passed. Zero-kilometer entry.</p>
<p class="mt-2 text-[10px] font-label-caps font-bold text-primary">0 KM RECORDED</p>
</div>
<button class="w-full py-3 bg-surface-container hover:bg-surface-variant/50 rounded-xl text-on-surface font-label-caps text-xs transition-all">
                                LOAD PREVIOUS RECORDS
                            </button>
</div>
</div>
</div>
</section>
</main>
</div>
<!-- Mobile Navigation Shell (Suppressed based on logic but included for responsive integrity) -->
<nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 pb-safe bg-surface-container dark:bg-surface-container-highest border-t border-outline-variant shadow-lg">
<div class="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 active:scale-90 transition-all duration-150">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">dashboard</span>
<span class="font-label-caps text-xs">Dashboard</span>
</div>
<div class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-variant">
<span class="material-symbols-outlined">directions_car</span>
<span class="font-label-caps text-xs">Vehicles</span>
</div>
<div class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-variant">
<span class="material-symbols-outlined">build</span>
<span class="font-label-caps text-xs">Maintenance</span>
</div>
<div class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-variant">
<span class="material-symbols-outlined">settings</span>
<span class="font-label-caps text-xs">Settings</span>
</div>
</nav>
<script>
        // Simple interactions
        document.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', (e) => {
                if(el.getAttribute('href') === '#') e.preventDefault();
            });
        });

        // Search shortcut simulation
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('input[type="text"]').focus();
            }
        });
    </script>
</body></html>

<!-- Araçlarım Redesign - Desktop -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>CarsTrack — Vehicles Management</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&amp;family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "secondary-fixed-dim": "#4edea3",
                    "secondary": "#006c49",
                    "background": "#faf8ff",
                    "on-background": "#131b2e",
                    "tertiary-fixed": "#e1e0ff",
                    "primary-container": "#2563eb",
                    "on-secondary": "#ffffff",
                    "on-tertiary-container": "#f1eeff",
                    "surface-container-highest": "#dae2fd",
                    "on-secondary-container": "#00714d",
                    "on-primary": "#ffffff",
                    "inverse-surface": "#283044",
                    "error": "#ba1a1a",
                    "primary-fixed-dim": "#b4c5ff",
                    "surface": "#faf8ff",
                    "outline-variant": "#c3c6d7",
                    "tertiary-fixed-dim": "#c0c1ff",
                    "on-primary-fixed-variant": "#003ea8",
                    "tertiary-container": "#585be6",
                    "tertiary": "#3e3fcc",
                    "on-error": "#ffffff",
                    "on-tertiary-fixed-variant": "#2f2ebe",
                    "on-surface": "#131b2e",
                    "on-secondary-fixed": "#002113",
                    "surface-dim": "#d2d9f4",
                    "secondary-container": "#6cf8bb",
                    "primary": "#004ac6",
                    "on-tertiary": "#ffffff",
                    "inverse-on-surface": "#eef0ff",
                    "on-secondary-fixed-variant": "#005236",
                    "primary-fixed": "#dbe1ff",
                    "surface-bright": "#faf8ff",
                    "on-tertiary-fixed": "#07006c",
                    "surface-container-lowest": "#ffffff",
                    "secondary-fixed": "#6ffbbe",
                    "surface-container": "#eaedff",
                    "on-primary-fixed": "#00174b",
                    "on-surface-variant": "#434655",
                    "outline": "#737686",
                    "surface-container-high": "#e2e7ff",
                    "error-container": "#ffdad6",
                    "surface-tint": "#0053db",
                    "surface-variant": "#dae2fd",
                    "surface-container-low": "#f2f3ff",
                    "on-primary-container": "#eeefff",
                    "on-error-container": "#93000a",
                    "inverse-primary": "#b4c5ff"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "base": "8px",
                    "gutter": "16px",
                    "container-margin-mobile": "16px",
                    "container-margin-desktop": "32px",
                    "touch-target-min": "44px"
            },
            "fontFamily": {
                    "label-caps": ["JetBrains Mono"],
                    "headline-lg": ["Hanken Grotesk"],
                    "body-lg": ["Inter"],
                    "title-md": ["Hanken Grotesk"],
                    "display-lg": ["Hanken Grotesk"],
                    "body-sm": ["Inter"],
                    "headline-lg-mobile": ["Hanken Grotesk"]
            },
            "fontSize": {
                    "label-caps": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "500"}],
                    "headline-lg": ["32px", {"lineHeight": "40px", "fontWeight": "600"}],
                    "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
                    "title-md": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
                    "display-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                    "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                    "headline-lg-mobile": ["24px", {"lineHeight": "32px", "fontWeight": "600"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .vehicle-card-hover:hover .image-overlay {
            background-color: rgba(0, 74, 198, 0.1);
        }
        .vehicle-card-hover:hover .car-image {
            transform: scale(1.05);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }
    </style>
</head>
<body class="bg-background text-on-surface font-body-lg overflow-hidden flex h-screen">
<!-- Sidebar Navigation -->
<aside class="w-72 bg-surface-container-lowest border-r border-outline-variant flex flex-col h-full shrink-0">
<div class="p-6 flex items-center gap-3">
<div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
<span class="material-symbols-outlined text-white" style="font-variation-settings: 'FILL' 1;">directions_car</span>
</div>
<div>
<h1 class="font-headline-lg text-primary text-[24px] leading-tight">CarsTrack</h1>
<p class="font-label-caps text-[10px] text-outline">Filo Yönetim Sistemi</p>
</div>
</div>
<nav class="flex-1 px-4 space-y-1 mt-4 custom-scrollbar overflow-y-auto">
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-on-surface-variant hover:bg-surface-variant/50" href="#">
<span class="material-symbols-outlined">dashboard</span>
<span class="font-title-md text-[15px]">Dashboard</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-primary-container/10 text-primary font-semibold" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">directions_car</span>
<span class="font-title-md text-[15px]">Vehicles</span>
<div class="ml-auto w-2 h-2 rounded-full bg-primary"></div>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-on-surface-variant hover:bg-surface-variant/50" href="#">
<span class="material-symbols-outlined">assignment</span>
<span class="font-title-md text-[15px]">Görevler</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-on-surface-variant hover:bg-surface-variant/50" href="#">
<span class="material-symbols-outlined">warning</span>
<span class="font-title-md text-[15px]">Arızalar</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-on-surface-variant hover:bg-surface-variant/50" href="#">
<span class="material-symbols-outlined">group</span>
<span class="font-title-md text-[15px]">Ekip</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-on-surface-variant hover:bg-surface-variant/50" href="#">
<span class="material-symbols-outlined">history</span>
<span class="font-title-md text-[15px]">Servis Geçmişi</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-on-surface-variant hover:bg-surface-variant/50" href="#">
<span class="material-symbols-outlined">analytics</span>
<span class="font-title-md text-[15px]">Filo Durumu</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-on-surface-variant hover:bg-surface-variant/50" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="font-title-md text-[15px]">Settings</span>
</a>
</nav>
<!-- User Profile -->
<div class="p-6 border-t border-outline-variant mt-auto">
<div class="flex items-center gap-3 bg-surface-container-low p-3 rounded-2xl">
<img alt="Mehmet Demirkök" class="w-10 h-10 rounded-full border-2 border-primary-container" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoI2DT84PKuyUYGV3kk_YuRPtJZlrX0CFkamQBCJEwbmHRduqvWAX3OG-hx1Po0AnejZ-MwesaMBTzFw7PvnkUUVJ6swH11umFtFwKDgRmYv3JkY9V3ud_eZDhPpqULByRik0YY6CIWlQueQdsKaSNodGaMuRgHV_Iu3-RS_71cZGqvoCp4seEfLfDejonfh4-hz6zE8iPxMj1_HJ1ByT7qWU0k5SgAK2WV1Q5EyK18zFtkgmO8rtUxeU8kJP-cWUU5upRnwCNCFpd"/>
<div class="flex flex-col">
<span class="font-body-lg font-bold text-[14px]">Mehmet Demirkök</span>
<span class="font-label-caps text-[10px] text-outline">SSTEK A.Ş.</span>
</div>
</div>
</div>
</aside>
<!-- Main Content Area -->
<main class="flex-1 flex flex-col h-full overflow-hidden">
<!-- Top App Bar -->
<header class="h-touch-target-min flex items-center justify-between px-container-margin-desktop bg-surface/80 backdrop-blur-md sticky top-0 z-50">
<div class="flex items-center gap-6">
<div>
<h2 class="font-headline-lg text-[20px] text-on-surface">Araçlarım</h2>
<p class="font-label-caps text-[12px] text-outline">5 kayıtlı araç bulundu</p>
</div>
</div>
<div class="flex items-center gap-4">
<div class="relative hidden lg:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
<input class="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 w-72 text-[14px] focus:ring-2 focus:ring-primary" placeholder="Araç veya plaka ara... (⌘K)" type="text"/>
</div>
<button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant/50 transition-colors">
<span class="material-symbols-outlined">filter_list</span>
</button>
<button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant/50 transition-colors">
<span class="material-symbols-outlined">notifications</span>
</button>
<button class="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20">
<span class="material-symbols-outlined">add</span>
<span>Yeni Araç</span>
</button>
</div>
</header>
<!-- Scrollable Content -->
<div class="flex-1 overflow-y-auto custom-scrollbar p-container-margin-desktop bg-background">
<!-- Filter Pills -->
<div class="flex gap-2 mb-8 overflow-x-auto pb-2">
<button class="px-4 py-1.5 rounded-full bg-primary text-white text-[14px] font-medium whitespace-nowrap">Tümü (5)</button>
<button class="px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-[14px] hover:bg-surface-variant transition-colors whitespace-nowrap">Müsait (3)</button>
<button class="px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-[14px] hover:bg-surface-variant transition-colors whitespace-nowrap">Görevde (1)</button>
<button class="px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-[14px] hover:bg-surface-variant transition-colors whitespace-nowrap">Bakımda (1)</button>
</div>
<!-- Vehicle Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
<!-- Card 1 -->
<div class="vehicle-card-hover group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
<div class="relative h-56 overflow-hidden">
<img class="car-image w-full h-full object-cover transition-transform duration-700" data-alt="A professional, high-resolution automotive photograph of a black Audi A6 sedan parked in a clean, modern parking space with soft, natural morning light. The car looks pristine and glossy, reflecting the architectural surroundings. The composition is sleek and corporate, utilizing a color palette of deep blacks, soft greys, and professional blues, embodying a sense of reliable fleet management and luxury." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPlZjVVtqiluLg7WzAusnZAx0KtEKdltsEX5GuZ9KRSMC585U924NFk0sRLY_mVqWNaobMbxoPQNpLbpJWz2idktqiQcRHfDtkKqFYA5LF9c-QgdgqJUktym0qis9MxhL4AJkDhjduIJADz8w8qNwhqjDoaoVX2U-eLH5iI-jDSI8d35y_-VvF-Ws0O1Wf4gngjwkDU3WHEpOEnpDy_4C6QqAS3qF0WNU3X_skaapJivHKsUcCDwuVgdFUJByQYYrCOsqghZ_-dRq1"/>
<div class="image-overlay absolute inset-0 bg-black/5 transition-colors duration-300"></div>
<div class="absolute top-4 left-4 flex gap-2">
<span class="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[12px] font-label-caps border border-white/20">06 FLV 373</span>
<span class="bg-secondary/20 backdrop-blur-md text-secondary-fixed-dim px-3 py-1 rounded-lg text-[12px] font-medium border border-secondary/20">Müsait</span>
</div>
<div class="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full flex flex-col items-center justify-center border border-white/20">
<span class="text-white text-[14px] font-bold">100</span>
<span class="text-white/60 text-[8px] font-label-caps">SKOR</span>
</div>
</div>
<div class="p-6 flex flex-col flex-1">
<div class="flex justify-between items-start mb-4">
<div>
<h3 class="font-headline-lg text-[22px] text-on-surface group-hover:text-primary transition-colors">Audi A6</h3>
<p class="text-outline text-[14px]">Model Yılı: 2025</p>
</div>
<button class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-primary transition-all">
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
<div class="grid grid-cols-3 gap-2 mt-auto">
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">speed</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">36.450 KM</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">local_gas_station</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Dizel</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">settings_input_component</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Otomatik</span>
</div>
</div>
</div>
</div>
<!-- Card 2 -->
<div class="vehicle-card-hover group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
<div class="relative h-56 overflow-hidden">
<img class="car-image w-full h-full object-cover transition-transform duration-700" data-alt="A deep blue modern Audi sedan presented in a high-key studio environment with soft, diffused top-down lighting that emphasizes its aerodynamic lines. The scene is clean, sterile, and professional, reflecting a high-tech corporate fleet aesthetic. The color palette centers on vibrant navy blue, metallic silver, and pure white, creating an atmosphere of precision, engineering excellence, and reliability." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKDVvygXSDw0LAKtItNW_YMpQdLfHziSaBIML8IL_UVY9kpmYYoiBUZyjkyiEZDUPm2xas6EP05pH2e9BbNe-iE-98t2wLz9FQuRD66DYqentPIuj60m_1c4kaw54mlmgZKAaGqGZJEUagSj_ZW1s-229PJJbejFTZY6fhJ-h_mYsaTW5lo3RFNBZdt9DKgnyIpwZLn3-gZaXuur8j0gVBk-r5NTyrJi7-Ym7jBToX2MzurFmBEb5gJU8qb5Xs1S-kFgYFdv6JbCrS"/>
<div class="image-overlay absolute inset-0 bg-black/5 transition-colors duration-300"></div>
<div class="absolute top-4 left-4 flex gap-2">
<span class="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[12px] font-label-caps border border-white/20">06 DJP 784</span>
<span class="bg-secondary/20 backdrop-blur-md text-secondary-fixed-dim px-3 py-1 rounded-lg text-[12px] font-medium border border-secondary/20">Müsait</span>
</div>
<div class="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full flex flex-col items-center justify-center border border-white/20">
<span class="text-white text-[14px] font-bold">100</span>
<span class="text-white/60 text-[8px] font-label-caps">SKOR</span>
</div>
</div>
<div class="p-6 flex flex-col flex-1">
<div class="flex justify-between items-start mb-4">
<div>
<h3 class="font-headline-lg text-[22px] text-on-surface group-hover:text-primary transition-colors">Audi A4</h3>
<p class="text-outline text-[14px]">Model Yılı: 2022</p>
</div>
<button class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-primary transition-all">
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
<div class="grid grid-cols-3 gap-2 mt-auto">
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">speed</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">105.575 KM</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">local_gas_station</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Dizel</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">settings_input_component</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Otomatik</span>
</div>
</div>
</div>
</div>
<!-- Card 3 -->
<div class="vehicle-card-hover group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
<div class="relative h-56 overflow-hidden">
<img class="car-image w-full h-full object-cover transition-transform duration-700" data-alt="A dark grey Renault Megane displayed in a minimalist urban setting at dusk. The lighting is sophisticated, with artificial street lamps creating long shadows and high-contrast highlights on the vehicle's body. The overall mood is professional, efficient, and modern, using a color palette of charcoal grey, amber highlights, and soft city blues, perfectly suited for an enterprise vehicle tracking dashboard." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWqez3uBuVwZoQ3IlcDBN09kQOOevsYDiS6nHyqKtbFz_tDeJtrK6ByXByaoioWBnE-BNRB56sdC5Bd1iSbs8uY6PfoWKXM4CRPBR5KqfRmpFJCXbEUxz8AGjEPK8rvpAxpxSuNtwUDYLZRhSNJ9KQA6H1C420SEG9Ks1EtKbPLp_bCtME30jQUPyh6jqqvwyefADjl9poXEG2RUt2MrYFX2Sr9zxs3CApRrlMNOKjzGlxEvopwAjKyo5NOqBMvYatm1ZvosgOMjYC"/>
<div class="image-overlay absolute inset-0 bg-black/5 transition-colors duration-300"></div>
<div class="absolute top-4 left-4 flex gap-2">
<span class="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[12px] font-label-caps border border-white/20">34 PPS 111</span>
<span class="bg-secondary/20 backdrop-blur-md text-secondary-fixed-dim px-3 py-1 rounded-lg text-[12px] font-medium border border-secondary/20">Müsait</span>
</div>
<div class="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full flex flex-col items-center justify-center border border-white/20">
<span class="text-white text-[14px] font-bold">100</span>
<span class="text-white/60 text-[8px] font-label-caps">SKOR</span>
</div>
</div>
<div class="p-6 flex flex-col flex-1">
<div class="flex justify-between items-start mb-4">
<div>
<h3 class="font-headline-lg text-[22px] text-on-surface group-hover:text-primary transition-colors">Renault Megane</h3>
<p class="text-outline text-[14px]">Model Yılı: 2026</p>
</div>
<button class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-primary transition-all">
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
<div class="grid grid-cols-3 gap-2 mt-auto">
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">speed</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">14 KM</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">local_gas_station</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Benzin</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">settings_input_component</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Manuel</span>
</div>
</div>
</div>
</div>
<!-- Card 4 -->
<div class="vehicle-card-hover group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
<div class="relative h-56 overflow-hidden">
<img class="car-image w-full h-full object-cover transition-transform duration-700" data-alt="A clean, white Renault sedan in a bright, modern underground parking facility with linear LED lighting. The image is bright and airy, representing cleanliness and operational readiness. The aesthetic is extremely professional, focusing on a minimalist palette of bright whites, cool greys, and primary blue accents, highlighting the car's efficiency and modern design within a managed fleet." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7KDOKY0gZ-qgv0v1VpQGB-xsMxf9vOmkKoczhXhaIARbowzr_M4829tEfaOLPtv07IyXvsr7ezFjGGkPAtwg52GJfWHV9m3xdBiY5WSddjXiMsiq8aixhc5V0NRGDA76xwOOIDS07wzD-clAGIGDI2WXkd45Ka6txthJdndBZqG0ARxEtEtF0uRViCgj8ZiIXLYwMLiZCpsSgo2h1k-a-nCzBjPH8qYA1LY3ijscpOaJoQSQNaqW6Rj7Ut_ZfQsQQw3EiHMl9L0JB"/>
<div class="image-overlay absolute inset-0 bg-black/5 transition-colors duration-300"></div>
<div class="absolute top-4 left-4 flex gap-2">
<span class="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[12px] font-label-caps border border-white/20">34 MLM 124</span>
<span class="bg-error/20 backdrop-blur-md text-error px-3 py-1 rounded-lg text-[12px] font-medium border border-error/20">Bakımda</span>
</div>
<div class="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full flex flex-col items-center justify-center border border-white/20">
<span class="text-white text-[14px] font-bold">100</span>
<span class="text-white/60 text-[8px] font-label-caps">SKOR</span>
</div>
</div>
<div class="p-6 flex flex-col flex-1">
<div class="flex justify-between items-start mb-4">
<div>
<h3 class="font-headline-lg text-[22px] text-on-surface group-hover:text-primary transition-colors">Renault Clio</h3>
<p class="text-outline text-[14px]">Model Yılı: 2024</p>
</div>
<button class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-primary transition-all">
<span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
<div class="grid grid-cols-3 gap-2 mt-auto">
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">speed</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">45.000 KM</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">local_gas_station</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Dizel</span>
</div>
<div class="bg-surface-container-low rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
<span class="material-symbols-outlined text-primary text-[20px]">settings_input_component</span>
<span class="font-label-caps text-[11px] text-on-surface-variant">Otomatik</span>
</div>
</div>
</div>
</div>
<!-- Add New Vehicle Placeholder Card -->
<button class="border-2 border-dashed border-outline-variant rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all group min-h-[400px]">
<div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary/10 transition-colors">
<span class="material-symbols-outlined text-outline group-hover:text-primary text-[32px]">add</span>
</div>
<div class="text-center">
<h3 class="font-title-md text-on-surface-variant group-hover:text-primary">Yeni Araç Ekle</h3>
<p class="text-outline text-[14px]">Filonuza yeni bir araç tanımlayın</p>
</div>
</button>
</div>
</div>
</main>
<!-- Global Interactions -->
<script>
        // Keyboard Shortcut ⌘K Simulation
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('input').focus();
            }
        });

        // Click effects on cards
        document.querySelectorAll('.vehicle-card-hover').forEach(card => {
            card.addEventListener('mousedown', () => {
                card.style.transform = 'scale(0.98)';
            });
            card.addEventListener('mouseup', () => {
                card.style.transform = 'scale(1)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'scale(1)';
            });
        });
    </script>
</body></html>