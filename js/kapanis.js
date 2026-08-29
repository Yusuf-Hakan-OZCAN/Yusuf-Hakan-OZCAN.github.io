/* ============================================================
   kapanis.js — Kapanış bölümü
   ------------------------------------------------------------
   "Beni işe almak ister misiniz?" sorusu ve kaçan "Hayır" butonu.

   Tasarım kararları:
     - Buton, imleç ÜSTÜNE GELİNCE değil YAKLAŞINCA kaçar.
       mouseenter beklenirse hızlı bir tıklamayla yakalanabiliyor.
     - Kaçarken bölümün öbür ucuna ışınlanmaz; imlecin ters yönünde
       kısa bir adım atar, böylece kovalanabilir kalır.
     - Bütün koordinatlar EKRANA değil .kapanis BÖLÜMÜNE göredir.
       Buton sayfanın tamamına yayılmaz, bölümün içinde kalır.
     - Buton nerede olduğunu JS kendi değişkeninde tutar, DOM'dan
       okumaz. Sebebi "konum" değişkeninin başında yazılı.
     - Dokunmatik ekranda hover yoktur; touchstart de dinleniyor.
     - Buton klavyeyle sekilemez (HTML'de tabindex="-1"), yoksa
       klavye kullanan ziyaretçi burada sıkışırdı.
   ============================================================ */

(function () {
  'use strict';

  var bolum    = document.getElementById('kapanis');
  var soruAlan = document.getElementById('kapanis-soru-alan');
  var butonlar = document.getElementById('kapanis-butonlar');
  var cevap    = document.getElementById('kapanis-cevap');
  var btnEvet  = document.getElementById('btn-evet');
  var btnHayir = document.getElementById('btn-hayir');

  // Beklenen öğelerden biri yoksa hiçbir şey yapma; sayfanın geri
  // kalanı etkilenmesin.
  if (!bolum || !soruAlan || !butonlar || !cevap || !btnEvet || !btnHayir) {
    return;
  }

  /* ---------- Ayarlar ---------- */
  // İmleç bu mesafeye girince buton kaçmaya başlar.
  var YAKLASMA_ESIGI = 95;
  // Kaçtıktan sonra imleçle arasında bırakmaya çalıştığı mesafe.
  var GUVENLI_MESAFE = 170;
  // Kaçış yönüne eklenen rastgele sapma (radyan).
  var YON_SAPMASI    = 0.7;
  var KENAR_PAYI     = 16;   // bölüm kenarına bırakılacak boşluk
  var YON_DENEMESI   = 12;   // köşeye sıkışınca denenecek yön sayısı
  var EN_KUCUK_OLCEK = 0.7;  // buton bundan fazla küçülmesin

  // Buton kaçtıkça değişen yazılar; ısrar edeni ödüllendirelim.
  var YAZILAR = [
    'Hayır', 'Hayır', 'Emin misiniz?', 'Gerçekten mi?',
    'Bir daha düşünün', 'Olmaz', 'Vazgeçin', 'Yakalayamazsınız'
  ];

  /* ---------- Durum ---------- */
  /*
    konum: butonun BÖLÜM İÇİNDEKİ mantıksal yeri { sol, ust }.

    Burası önemli: konumu getBoundingClientRect() ile DOM'dan
    OKUMUYORUZ. CSS geçişi sürerken o fonksiyon animasyonun ara
    değerini döndürüyor. Kaçış yönü "imleçten butona doğru" diye
    hesaplandığı için, geride kalmış bir ara değerden okumak yönü
    sürekli aynı tarafa kilitliyor; imleç de o yöne ilerlediğinden
    buton tek yönde kenara süpürülüp orada sıkışıyordu.

    Doğrusu: hedefi biz belirlediğimiz için nerede olduğunu da biz
    biliyoruz. Tek doğru kaynak bu değişken.
  */
  var konum       = null;
  var kacisSayisi = 0;
  var kacakMi     = false;   // buton karttan çıkarıldı mı
  var cevaplandi  = false;

  /*
    kaymaX/kaymaY: "left değeri" ile "bölüm içindeki gerçek yer"
    arasındaki fark. Normalde sıfır olmalı, çünkü .kapanis
    position:relative ve buton onun doğrudan çocuğu. Ama tarayıcı
    beklenmedik bir konumlandırma çerçevesi seçerse sıfır olmaz.
    Varsayıma güvenmek yerine ölçüyoruz.
  */
  var kaymaX = 0;
  var kaymaY = 0;

  // requestAnimationFrame ile kare başına tek kaçış
  var bekleyenImlec = null;
  var kareIstegi    = 0;

  /* ------------------------------------------------------------
     Yardımcılar
     ------------------------------------------------------------ */

  function bolumKutusu() {
    return bolum.getBoundingClientRect();
  }

  /* Ekran koordinatını bölüm içi koordinata çevirir. */
  function yerele(imlecX, imlecY) {
    var k = bolumKutusu();
    return { x: imlecX - k.left, y: imlecY - k.top };
  }

  /*
     Butonun bölüm içinde kalabileceği sınırlar.
     Ölçü olarak offsetWidth/offsetHeight kullanılıyor: bunlar
     yerleşim kutusunu verir. getBoundingClientRect() ise transform
     scale() uygulanmış görsel kutuyu verirdi ve left/top yerleşim
     kutusunu konumlandırdığı için ikisi karışırdı.
  */
  function sinirlar() {
    var g = btnHayir.offsetWidth;
    var y = btnHayir.offsetHeight;
    var k = bolumKutusu();
    return {
      enSol: KENAR_PAYI,
      enUst: KENAR_PAYI,
      enSag: Math.max(KENAR_PAYI, k.width  - g - KENAR_PAYI),
      enAlt: Math.max(KENAR_PAYI, k.height - y - KENAR_PAYI)
    };
  }

  /* Butonun bölüm içindeki mantıksal merkezi. Henüz kaçmadıysa
     karttaki gerçek yerinden okunur — o an animasyon yok, güvenli. */
  function merkez() {
    if (konum) {
      return {
        x: konum.sol + btnHayir.offsetWidth  / 2,
        y: konum.ust + btnHayir.offsetHeight / 2
      };
    }
    var kutu = btnHayir.getBoundingClientRect();
    var k    = bolumKutusu();
    return {
      x: (kutu.left - k.left) + kutu.width  / 2,
      y: (kutu.top  - k.top)  + kutu.height / 2
    };
  }

  /* Mantıksal konumu uygular; her zaman sınırların içine kırpar.
     Böylece buton hiçbir koşulda bölümün dışına çıkamaz. */
  function uygula() {
    var s = sinirlar();
    konum.sol = Math.min(Math.max(s.enSol, konum.sol), s.enSag);
    konum.ust = Math.min(Math.max(s.enUst, konum.ust), s.enAlt);
    btnHayir.style.left = (konum.sol + kaymaX) + 'px';
    btnHayir.style.top  = (konum.ust + kaymaY) + 'px';
  }

  /* ------------------------------------------------------------
     Konumlandırma çerçevesini ölçer.

     Butona bilinen bir left/top verip bölümün içinde gerçekten
     nereye düştüğünü okuyoruz. Fark varsa telafi payı olarak
     saklanıyor. Ölçüm sırasında geçiş kapatılıyor: açık olsaydı
     animasyonun ara değerini okur ve yanlış bir kayma hesaplardık.
     ------------------------------------------------------------ */
  function kaymayiOlc() {
    if (!konum) return;

    var oncekiGecis = btnHayir.style.transition;
    btnHayir.style.transition = 'none';

    kaymaX = 0;
    kaymaY = 0;
    btnHayir.style.left = konum.sol + 'px';
    btnHayir.style.top  = konum.ust + 'px';

    var olculen = btnHayir.getBoundingClientRect();
    var k       = bolumKutusu();
    kaymaX = konum.sol - (olculen.left - k.left);
    kaymaY = konum.ust - (olculen.top  - k.top);

    uygula();
    void btnHayir.offsetWidth;              // düzeltme yerine otursun
    btnHayir.style.transition = oncekiGecis; // geçiş geri açılır
  }

  /* ------------------------------------------------------------
     Butonu karttan çıkarıp bölüm katmanına taşır.
     Kartın içinde kalsaydı kaçış alanı kartın kutusuyla sınırlı
     kalırdı; bölümün çocuğu olunca bütün bölümü kullanabiliyor.
     ------------------------------------------------------------ */
  function kartanCikar() {
    if (kacakMi) return;

    var kutu = btnHayir.getBoundingClientRect();
    var k    = bolumKutusu();

    // Buton gidince "Evet" ortaya kaymasın diye yerine aynı
    // boyutta görünmez bir dolgu bırakılıyor.
    var yer = document.createElement('span');
    yer.className = 'kapanis__btn-yeri';
    yer.style.width  = kutu.width  + 'px';
    yer.style.height = kutu.height + 'px';
    btnHayir.parentNode.insertBefore(yer, btnHayir);

    konum = { sol: kutu.left - k.left, ust: kutu.top - k.top };

    btnHayir.classList.add('kapanis__btn--kacak');
    bolum.appendChild(btnHayir);

    // Hem konumlandırma çerçevesini ölçer hem de başlangıç konumunu
    // geçiş kapalıyken yerine oturtur; buton ilk hamlede zıplamaz.
    kaymayiOlc();

    kacakMi = true;
  }

  /* ------------------------------------------------------------
     Butonun kaçacağı noktayı hesaplar.

     Mantık: imleçten butona doğru olan yön, kaçış yönüdür. Buton o
     yönde imlecin GUVENLI_MESAFE kadar ötesine geçer — kısa bir adım
     atar, bölümün öbür köşesine ışınlanmaz.

     Köşeye sıkıştığında hedef, sınırlara kırpılınca imlecin dibine
     düşebilir. O yüzden açıyı kademeli çevirip (+30°, -30°, +60° ...)
     imlecin etrafından dolanacak bir yön arıyoruz.
     ------------------------------------------------------------ */
  function kacisHedefi(imlecX, imlecY) {
    var g = btnHayir.offsetWidth;
    var y = btnHayir.offsetHeight;
    var s = sinirlar();
    var m = merkez();

    var dx = m.x - imlecX;
    var dy = m.y - imlecY;
    var uzaklik = Math.sqrt(dx * dx + dy * dy);

    // İmleç tam butonun üstündeyse yön belirsizdir; rastgele seç.
    var temelAci = (uzaklik < 1)
      ? Math.random() * Math.PI * 2
      : Math.atan2(dy, dx);

    for (var i = 0; i < YON_DENEMESI; i++) {
      // i=0 tercih edilen yön. Sıkışırsa açılan bir yelpaze taranır:
      // 0, +30°, -30°, +60°, -60° ...
      var kayma = Math.ceil(i / 2) * (Math.PI / 6) * (i % 2 === 1 ? 1 : -1);
      var aci   = temelAci + kayma + (Math.random() - 0.5) * YON_SAPMASI;

      var sol = imlecX + Math.cos(aci) * GUVENLI_MESAFE - g / 2;
      var ust = imlecY + Math.sin(aci) * GUVENLI_MESAFE - y / 2;

      sol = Math.min(Math.max(s.enSol, sol), s.enSag);
      ust = Math.min(Math.max(s.enUst, ust), s.enAlt);

      // Kırpma sonrası hâlâ imleçten yeterince uzak mı? Değilse
      // bu yön işe yaramadı, yelpazede bir sonrakini dene.
      var kx = (sol + g / 2) - imlecX;
      var ky = (ust + y / 2) - imlecY;
      if (Math.sqrt(kx * kx + ky * ky) >= YAKLASMA_ESIGI + 10) {
        return { sol: sol, ust: ust };
      }
    }

    // Hiçbir yön tutmadıysa (bölüm çok küçük) rastgele bir yer
    return {
      sol: s.enSol + Math.random() * (s.enSag - s.enSol),
      ust: s.enUst + Math.random() * (s.enAlt - s.enUst)
    };
  }

  /* ------------------------------------------------------------
     Butonu kaçırır. Koordinatlar bölüm içi.
     ------------------------------------------------------------ */
  function kac(yerelX, yerelY) {
    if (cevaplandi) return;

    kartanCikar();

    konum = kacisHedefi(yerelX, yerelY);
    uygula();

    kacisSayisi++;

    // Adımlar kısa olduğu için kaçış sayısı hızlı artıyor; küçülme ve
    // yazı değişimi buna göre yavaşlatıldı.
    var olcek = Math.max(EN_KUCUK_OLCEK, 1 - kacisSayisi * 0.014);
    btnHayir.style.transform = 'scale(' + olcek + ')';

    var sira = Math.min(Math.floor(kacisSayisi / 3), YAZILAR.length - 1);
    var yazi = YAZILAR[sira];
    if (btnHayir.textContent !== yazi) btnHayir.textContent = yazi;
  }

  /* ------------------------------------------------------------
     Kaçış isteği: kare başına en fazla bir kez çalıştırılır.
     pointermove saniyede 100'den fazla tetiklenebiliyor.
     ------------------------------------------------------------ */
  function kacIste(yerelX, yerelY) {
    bekleyenImlec = { x: yerelX, y: yerelY };
    if (kareIstegi) return;

    kareIstegi = window.requestAnimationFrame(function () {
      kareIstegi = 0;
      var nokta = bekleyenImlec;
      bekleyenImlec = null;
      if (nokta) kac(nokta.x, nokta.y);
    });
  }

  /* ------------------------------------------------------------
     "Evet" cevabı
     ------------------------------------------------------------ */
  function evetCevabi() {
    if (cevaplandi) return;
    cevaplandi = true;

    // Kaçan buton ve kartta bıraktığı dolgu artık gereksiz.
    // btnHayir kaçtıysa .kapanis'in, kaçmadıysa butonlar'ın çocuğu.
    var dolgu = butonlar.querySelector('.kapanis__btn-yeri');
    if (dolgu) dolgu.remove();
    if (btnHayir.parentNode) btnHayir.remove();

    // Sorunun tamamı gider, yerine uğurlama gelir.
    soruAlan.hidden = true;
    cevap.hidden = false;
  }

  /* ------------------------------------------------------------
     Olay dinleyicileri
     ------------------------------------------------------------ */

  // 1) Fare yaklaşınca kaç.
  //    Bölüm ekran dışındayken imleç ona doğal olarak uzak kalır,
  //    mesafe eşiği aşılmaz; ayrıca görünürlük kontrolüne gerek yok.
  document.addEventListener('pointermove', function (olay) {
    if (cevaplandi || olay.pointerType === 'touch') return;

    var i = yerele(olay.clientX, olay.clientY);
    var m = merkez();
    var dx = i.x - m.x;
    var dy = i.y - m.y;

    if (Math.sqrt(dx * dx + dy * dy) < YAKLASMA_ESIGI) {
      kacIste(i.x, i.y);
    }
  }, { passive: true });

  // 2) Dokunmatikte parmak değer değmez kaç.
  //    preventDefault, dokunmanın click'e dönüşmesini engeller.
  btnHayir.addEventListener('touchstart', function (olay) {
    var nokta = olay.touches[0];
    var i = nokta ? yerele(nokta.clientX, nokta.clientY) : merkez();
    kac(i.x, i.y);
    olay.preventDefault();
  }, { passive: false });

  // 3) Emniyet kemeri: her şeye rağmen tıklanırsa yine kaçsın,
  //    "hayır" cevabı hiçbir zaman kaydedilmesin.
  btnHayir.addEventListener('click', function (olay) {
    olay.preventDefault();
    var i = yerele(olay.clientX || 0, olay.clientY || 0);
    kac(i.x, i.y);
  });

  // 4) pointermove desteklenmeyen ortamlar için yedek
  btnHayir.addEventListener('mouseenter', function (olay) {
    var i = yerele(olay.clientX, olay.clientY);
    kacIste(i.x, i.y);
  });

  // 5) "Evet" — tek çıkış yolu
  btnEvet.addEventListener('click', evetCevabi);

  // 6) Pencere yeniden boyutlanırsa bölümün ölçüsü değişir; buton
  //    dışarıda kalabilir. kaymayiOlc() hem çerçeveyi yeniden ölçer
  //    hem de uygula() ile butonu yeni sınırların içine çeker.
  window.addEventListener('resize', function () {
    if (!kacakMi || cevaplandi || !konum) return;
    kaymayiOlc();
  });
})();
