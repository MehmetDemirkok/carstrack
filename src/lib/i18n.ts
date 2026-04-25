export type Locale = "tr" | "en";

export const translations = {
  tr: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_vehicles: "Araçlarım",
    nav_history: "Servis Geçmişi",
    nav_analytics: "Filo Durumu",
    nav_settings: "Ayarlar",
    nav_add_vehicle: "Yeni Araç Ekle",

    // TopBar
    topbar_welcome: "Hoş geldin,",

    // Settings
    settings_title: "Ayarlar",
    settings_preferences: "Tercihler",
    settings_app: "Uygulama",
    settings_premium: "Premium Üye",
    settings_theme: "Tema",
    settings_theme_dark: "Koyu Mod",
    settings_theme_light: "Açık Mod",
    settings_theme_system: "Sistem",
    settings_notifications: "Bildirimler",
    settings_notifications_desc: "Bakım ve belge hatırlatmaları",
    settings_language: "Dil",
    settings_add_to_home: "Ana Ekrana Ekle",
    settings_add_to_home_desc: "PWA olarak yükle",
    settings_privacy: "Gizlilik & Güvenlik",
    settings_help: "Yardım & Destek",
    settings_reset_data: "Verileri Sıfırla",
    settings_reset_data_desc: "Tüm araç ve servis kayıtlarını sil",
    settings_about: "Hakkında",
    settings_version: "Sürüm 1.0.0",

    // Reset dialog
    reset_title: "Verileri Sıfırla",
    reset_body: "Tüm araç ve servis kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.",
    reset_cancel: "İptal",
    reset_confirm: "Sıfırla",

    // Language dialog
    lang_title: "Dil Seç",
    lang_tr: "Türkçe",
    lang_en: "İngilizce",

    // Notifications
    notif_enabled: "Açık",
    notif_disabled: "Kapalı",
    notif_denied: "Engellendi",
    notif_denied_hint: "Tarayıcı ayarlarından bildirimlere izin verin.",

    // About dialog
    about_title: "CarsTrack Hakkında",
    about_desc: "Araç bakım ve servis geçmişinizi kolayca takip edin. Sigorta, muayene ve bakım hatırlatmaları ile filonuzu her zaman güvende tutun.",
    about_version_label: "Sürüm",
    about_developer: "Geliştirici",
    about_tech: "Teknoloji",
    about_close: "Kapat",

    // Install dialog
    install_title: "Ana Ekrana Ekle",
    install_ios_hint: "Safari'de ekranın altındaki paylaş butonuna basıp \"Ana Ekrana Ekle\" seçin.",
    install_btn: "Yükle",
    install_not_supported: "Bu tarayıcı uygulama yüklemeyi desteklemiyor.",
    install_already: "Uygulama zaten yüklü.",

    // Account
    settings_account: "Hesap",
    settings_logout: "Çıkış Yap",
    role_manager: "Yönetici",
    role_driver: "Sürücü",

    // Privacy page
    privacy_title: "Gizlilik & Güvenlik",
    privacy_data_title: "Toplanan Veriler",
    privacy_data_desc: "Araç bilgileri, servis kayıtları ve hesap bilgileriniz güvenli bir şekilde saklanır. Kişisel verileriniz üçüncü taraflarla paylaşılmaz.",
    privacy_storage_title: "Veri Depolama",
    privacy_storage_desc: "Verileriniz Supabase altyapısında şifreli olarak saklanır. Tarayıcı önbelleğinde yerel kopyalar tutulabilir.",
    privacy_security_title: "Güvenlik",
    privacy_security_desc: "Hesabınız e-posta ve parola ile korunmaktadır. Oturum token'ları güvenli HTTP-only cookie'lerde tutulur.",
    privacy_delete_title: "Veri Silme",
    privacy_delete_desc: "Ayarlar > Verileri Sıfırla seçeneğiyle tüm araç ve servis verilerinizi kalıcı olarak silebilirsiniz.",
    privacy_third_title: "Üçüncü Taraf Hizmetler",
    privacy_third_desc: "Kimlik doğrulama ve veri depolama için Supabase kullanılmaktadır. Supabase'in gizlilik politikası geçerlidir.",
    privacy_back: "Geri",

    // Help & Support
    help_title: "Yardım & Destek",
    help_faq_title: "Sık Sorulan Sorular",
    help_q1: "Araç nasıl eklenir?",
    help_a1: "Alt menüden Araçlar sekmesine gidin ve + butonuna basın.",
    help_q2: "Servis kaydı nasıl eklenir?",
    help_a2: "Araç detay sayfasından \"Servis Ekle\" butonuna basın.",
    help_q3: "Bildirimler nasıl etkinleştirilir?",
    help_a3: "Ayarlar > Bildirimler seçeneğinden etkinleştirebilirsiniz.",
    help_contact: "Destek için:",
    help_close: "Kapat",
  },

  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_vehicles: "My Vehicles",
    nav_history: "Service History",
    nav_analytics: "Fleet Status",
    nav_settings: "Settings",
    nav_add_vehicle: "Add New Vehicle",

    // TopBar
    topbar_welcome: "Welcome,",

    // Settings
    settings_title: "Settings",
    settings_preferences: "Preferences",
    settings_app: "Application",
    settings_premium: "Premium Member",
    settings_theme: "Theme",
    settings_theme_dark: "Dark Mode",
    settings_theme_light: "Light Mode",
    settings_theme_system: "System",
    settings_notifications: "Notifications",
    settings_notifications_desc: "Maintenance and document reminders",
    settings_language: "Language",
    settings_add_to_home: "Add to Home Screen",
    settings_add_to_home_desc: "Install as PWA",
    settings_privacy: "Privacy & Security",
    settings_help: "Help & Support",
    settings_reset_data: "Reset Data",
    settings_reset_data_desc: "Delete all vehicle and service records",
    settings_about: "About",
    settings_version: "Version 1.0.0",

    // Reset dialog
    reset_title: "Reset Data",
    reset_body: "All vehicle and service records will be permanently deleted. This action cannot be undone.",
    reset_cancel: "Cancel",
    reset_confirm: "Reset",

    // Language dialog
    lang_title: "Select Language",
    lang_tr: "Turkish",
    lang_en: "English",

    // Notifications
    notif_enabled: "On",
    notif_disabled: "Off",
    notif_denied: "Blocked",
    notif_denied_hint: "Enable notifications in your browser settings.",

    // About dialog
    about_title: "About CarsTrack",
    about_desc: "Easily track your vehicle maintenance and service history. Keep your fleet safe with insurance, inspection, and maintenance reminders.",
    about_version_label: "Version",
    about_developer: "Developer",
    about_tech: "Technology",
    about_close: "Close",

    // Install dialog
    install_title: "Add to Home Screen",
    install_ios_hint: "In Safari, tap the share button at the bottom of the screen and select \"Add to Home Screen\".",
    install_btn: "Install",
    install_not_supported: "This browser doesn't support app installation.",
    install_already: "App is already installed.",

    // Account
    settings_account: "Account",
    settings_logout: "Sign Out",
    role_manager: "Manager",
    role_driver: "Driver",

    // Privacy page
    privacy_title: "Privacy & Security",
    privacy_data_title: "Data Collected",
    privacy_data_desc: "Your vehicle information, service records, and account details are stored securely. Your personal data is never shared with third parties.",
    privacy_storage_title: "Data Storage",
    privacy_storage_desc: "Your data is stored encrypted on Supabase infrastructure. Local copies may be kept in browser cache.",
    privacy_security_title: "Security",
    privacy_security_desc: "Your account is protected with email and password. Session tokens are stored in secure HTTP-only cookies.",
    privacy_delete_title: "Data Deletion",
    privacy_delete_desc: "You can permanently delete all your vehicle and service data via Settings > Reset Data.",
    privacy_third_title: "Third-Party Services",
    privacy_third_desc: "Supabase is used for authentication and data storage. Supabase's privacy policy applies.",
    privacy_back: "Back",

    // Help & Support
    help_title: "Help & Support",
    help_faq_title: "Frequently Asked Questions",
    help_q1: "How do I add a vehicle?",
    help_a1: "Go to the Vehicles tab from the bottom menu and tap the + button.",
    help_q2: "How do I add a service record?",
    help_a2: "Tap the \"Add Service\" button on the vehicle detail page.",
    help_q3: "How do I enable notifications?",
    help_a3: "You can enable them from Settings > Notifications.",
    help_contact: "For support:",
    help_close: "Close",
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;
