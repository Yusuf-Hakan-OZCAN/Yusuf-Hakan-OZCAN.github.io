# Yusuf-Hakan-OZCAN.github.io

Kişisel tanıtım sitem. Saf HTML, CSS ve JavaScript — derleme adımı,
paket yöneticisi veya harici bağımlılık yok.

## Önizleme

Dosyayı doğrudan tarayıcıda açabilirsin:

    index.html   (çift tıkla)

Yerel sunucuyla denemek istersen (bazı tarayıcılar `file://` altında
farklı davranabiliyor):

    python -m http.server 8000

Sonra tarayıcıda `http://localhost:8000` adresine git.

## Sayfa akışı

    Hero          Ad ve tek cümlelik tanıtım
    01 Projeler   Beş proje, geniş şeritler halinde
    02 Kod        Öne çıkan iki kod parçası
    03 Yetenekler Diller, kütüphaneler, konular, yöntemler, araçlar
    04 Kapanış    "Beni işe almak ister misiniz?"
    Alt bilgi     GitHub bağlantısı

Kapanış bölümündeki "Hayır" butonu imleç yaklaşınca kaçar. Bu bölüm
bilerek en sonda: soru, ziyaretçi projeleri ve kodu gördükten sonra
soruluyor. Üst menüde bağlantısı yok, aşağı inen keşfediyor.

## Dosya düzeni

    index.html        Tek sayfa, bölümler halinde
    css/style.css     Renk değişkenleri ve tüm stiller
    js/kapanis.js     Kapanış bölümü, kaçan "Hayır" butonu
    js/main.js        Menü, kaydırma, belirme animasyonları
    assets/           Proje görselleri
    .nojekyll         GitHub Pages dosyaları olduğu gibi sunsun

## Görseller

`assets/` içindeki beş PNG proje şeritlerinde kullanılıyor. Hepsi
kırpılmadan, doğal oranıyla gösteriliyor ve tıklanınca tam boyutta
açılıyor. Yeni bir görsel eklerken:

- Genişliği 900–1000 piksel yeterli; daha büyüğü gereksiz yük.
- `<img>` etiketindeki `width` ve `height` değerleri dosyanın gerçek
  boyutuyla birebir aynı olmalı. Yanlışsa sayfa yüklenirken içerik
  zıplar.

## Notlar

- Renkleri değiştirmek için `css/style.css` içindeki `:root`
  bloğundaki değişkenler yeterli; başka yere dokunmaya gerek yok.
- JavaScript kapalıysa belirme animasyonları devre dışı kalır ve
  içerik olduğu gibi görünür; hiçbir şey gizlenmez.
- İşletim sisteminde "hareketi azalt" ayarı açıksa animasyonlar
  otomatik olarak devre dışı kalır.
- Kapanış bölümündeki buton klavyeyle sekilmez (`tabindex="-1"`):
  odaklanınca da kaçsaydı klavye kullanan ziyaretçi orada sıkışırdı.
