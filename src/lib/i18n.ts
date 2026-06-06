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
    nav_tasks: "Görevler",

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
    notif_email: "E-posta Bildirimleri",
    notif_email_desc: "Sigorta, muayene ve bakım uyarılarını e-posta ile al",
    notif_email_saving: "Kaydediliyor...",

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
    role_manager: "Şirket Yetkilisi",
    role_operator: "Operatör",
    role_user: "Kullanıcı",

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
    help_cat_all: "Tümü",
    help_cat_vehicles: "Araçlar",
    help_cat_maintenance: "Bakım & Servis",
    help_cat_tasks: "Görevler",
    help_cat_account: "Hesap",
    // Araçlar
    help_q1: "Araç nasıl eklenir?",
    help_a1: "Araçlar sayfasında sağ üstteki + butonuna basın. Plaka, marka, model ve yıl bilgilerini doldurup kaydedin.",
    help_q2: "Araç bilgileri nasıl güncellenir?",
    help_a2: "Araç detay sayfasını açın, sağ üstteki düzenle ikonuna basarak tüm bilgileri güncelleyebilirsiniz.",
    help_q3: "Araç nasıl silinir?",
    help_a3: "Araç detay sayfasındaki menüden 'Sil' seçeneğini kullanın. Bu işlem geri alınamaz.",
    help_q4: "Birden fazla araç aynı anda silinebilir mi?",
    help_a4: "Araçlar listesinde 'Seç' modunu açıp birden fazla araç işaretleyerek toplu silme yapabilirsiniz.",
    // Bakım & Servis
    help_q5: "Servis kaydı nasıl eklenir?",
    help_a5: "Araç detay sayfasını açın ve 'Servis Ekle' butonuna basın. Tarih, tutar ve yapılan işlemi girerek kaydedin.",
    help_q6: "Sigorta ve muayene tarihleri nasıl girilir?",
    help_a6: "Araç eklerken veya düzenlerken ilgili tarih alanlarını doldurun. Süresi yaklaşan araçlar için otomatik uyarı alırsınız.",
    help_q7: "KM takibi nasıl yapılır?",
    help_a7: "Araç detay sayfasındaki kilometre alanını güncelleyin. Her servis kaydına da kilometre girebilirsiniz.",
    help_q8: "Araç sağlık skoru nasıl hesaplanır?",
    help_a8: "Sigorta ve muayene geçerliliği (%30) ile bakım öğelerinin tamamlanma oranı (%70) baz alınarak 0–100 arası hesaplanır. Yüksek skor = iyi durumda araç.",
    // Görevler
    help_q9: "Sürüş görevi nasıl oluşturulur?",
    help_a9: "Görevler sayfasında + butonuna basın, araç ve sürücüyü seçin, tarih ile açıklama ekleyin.",
    help_q10: "Görevi nasıl başlatır ve bitiririm?",
    help_a10: "Görevler listesinde göreve tıklayın, 'Başlat' butonuyla aktif edin. Tamamlanınca 'Bitir' butonuna basın.",
    // Hesap & Ayarlar
    help_q11: "Sürücü nasıl ekleniyor?",
    help_a11: "Ayarlar > Kullanıcılar bölümünden 'Sürücü Ekle'ye basın. Sürücü davet e-postası alacak ve şirkete katılacak.",
    help_q12: "Şifremi unuttum, ne yapmalıyım?",
    help_a12: "Giriş ekranındaki 'Şifremi Unuttum' bağlantısına tıklayın. E-posta adresinize sıfırlama linki gönderilir.",
    help_q13: "Servis verilerimi Excel'e aktarabilir miyim?",
    help_a13: "Tarihçe sayfasındaki 'Excel'e Aktar' butonuyla tüm servis kayıtlarınızı .xlsx dosyası olarak indirebilirsiniz.",
    help_q14: "Uygulamayı telefona nasıl yüklerim?",
    help_a14: "Ayarlar'daki 'Uygulamayı Kur' butonuna basın. iOS'ta Safari menüsünden 'Ana Ekrana Ekle'yi seçin.",
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
    nav_tasks: "Tasks",

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
    notif_email: "Email Notifications",
    notif_email_desc: "Receive insurance, inspection and maintenance alerts by email",
    notif_email_saving: "Saving...",

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
    role_operator: "Operator",
    role_user: "User",

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
    help_cat_all: "All",
    help_cat_vehicles: "Vehicles",
    help_cat_maintenance: "Maintenance",
    help_cat_tasks: "Tasks",
    help_cat_account: "Account",
    // Vehicles
    help_q1: "How do I add a vehicle?",
    help_a1: "On the Vehicles page, tap the + button in the top right. Fill in the plate, brand, model, and year to save.",
    help_q2: "How do I update vehicle details?",
    help_a2: "Open the vehicle detail page and tap the edit icon in the top right to update the information.",
    help_q3: "How do I delete a vehicle?",
    help_a3: "Use the 'Delete' option from the vehicle detail page menu. This action cannot be undone.",
    help_q4: "Can I delete multiple vehicles at once?",
    help_a4: "Enable 'Select' mode on the Vehicles list, check multiple vehicles, and delete them in bulk.",
    // Maintenance & Service
    help_q5: "How do I add a service record?",
    help_a5: "Open the vehicle detail page and tap 'Add Service'. Enter the date, amount, and description to save.",
    help_q6: "How do I enter insurance and inspection dates?",
    help_a6: "Fill in the date fields when adding or editing a vehicle. You'll get automatic alerts when dates approach.",
    help_q7: "How does mileage tracking work?",
    help_a7: "Update the mileage field on the vehicle detail page. You can also enter mileage on each service record.",
    help_q8: "How is the vehicle health score calculated?",
    help_a8: "Based on insurance/inspection validity (30%) and maintenance item completion rate (70%), scored 0–100. Higher = better condition.",
    // Tasks
    help_q9: "How do I create a driving task?",
    help_a9: "On the Tasks page, tap the + button, select the vehicle and driver, then add a date and description.",
    help_q10: "How do I start and complete a task?",
    help_a10: "Click a task in the list and tap 'Start' to activate it. When done, tap 'Finish' to complete it.",
    // Account & Settings
    help_q11: "How do I add a driver?",
    help_a11: "Go to Settings > Users and tap 'Add Driver'. They'll receive an invitation email to join your company.",
    help_q12: "I forgot my password, what should I do?",
    help_a12: "Click 'Forgot Password' on the login screen. A reset link will be sent to your email address.",
    help_q13: "Can I export service data to Excel?",
    help_a13: "Yes! Use the 'Export to Excel' button on the History page to download all records as an .xlsx file.",
    help_q14: "How do I install the app on my phone?",
    help_a14: "Tap 'Install App' in Settings. On iOS, use Safari's share menu and select 'Add to Home Screen'.",
    help_contact: "For support:",
    help_close: "Close",
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;
