/* ============================================================
   main.js — Site davranışları
   ------------------------------------------------------------
   1. Sayfa kaydırılınca üst menüye ayırıcı çizgi
   2. Mobil menünün açılıp kapanması
   3. Ekrana giren bölümlerin yumuşakça belirmesi
   4. Görünen bölümün menüde vurgulanması

   Yumuşak kaydırmanın kendisi CSS tarafında (scroll-behavior)
   halledildi; burada JS ile tekrar yapılmıyor.
   ============================================================ */

(function () {
  'use strict';

  var ustmenu     = document.getElementById('ustmenu');
  var menuToggle  = document.getElementById('menu-toggle');
  var menuListesi = document.getElementById('menu-listesi');

  /* ------------------------------------------------------------
     1. KAYDIRINCA MENÜ ÇİZGİSİ
     ------------------------------------------------------------
     scroll olayı saniyede yüzlerce kez tetiklenebilir. Her seferinde
     DOM'a dokunmak yerine requestAnimationFrame ile ekranın yenileme
     hızına bağlanıyoruz.
     ------------------------------------------------------------ */
  var beklemede = false;

  function kaydirmaDurumu() {
    if (ustmenu) {
      ustmenu.classList.toggle('kaydirildi', window.scrollY > 8);
    }
    etkinBolumuIsaretle();
    beklemede = false;
  }

  window.addEventListener('scroll', function () {
    if (beklemede) return;
    beklemede = true;
    window.requestAnimationFrame(kaydirmaDurumu);
  }, { passive: true });


  /* ------------------------------------------------------------
     2. MOBİL MENÜ
     ------------------------------------------------------------ */
  if (menuToggle && menuListesi) {

    function menuyuKapat() {
      menuListesi.classList.remove('acik');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Menüyü aç');
    }

    function menuyuAc() {
      menuListesi.classList.add('acik');
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Menüyü kapat');
    }

    menuToggle.addEventListener('click', function () {
      var acikMi = menuToggle.getAttribute('aria-expanded') === 'true';
      if (acikMi) { menuyuKapat(); } else { menuyuAc(); }
    });

    // olay.target her zaman bir Element olmayabilir (metin düğümü,
    // document...). closest() çağırmadan önce doğrulanıyor; yoksa
    // "closest is not a function" hatası menüyü tamamen kilitler.
    function enYakin(olay, secici) {
      var hedef = olay.target;
      return (hedef && typeof hedef.closest === 'function')
        ? hedef.closest(secici)
        : null;
    }

    // Bir bağlantıya tıklanınca menü kapansın, yoksa hedef bölümün
    // üstünü örter.
    menuListesi.addEventListener('click', function (olay) {
      if (enYakin(olay, 'a')) menuyuKapat();
    });

    // Menü açıkken dışarı tıklanırsa kapansın
    document.addEventListener('click', function (olay) {
      if (!menuListesi.classList.contains('acik')) return;
      if (enYakin(olay, '#menu-listesi')) return;
      if (enYakin(olay, '#menu-toggle')) return;
      menuyuKapat();
    });

    // Escape ile kapansın
    document.addEventListener('keydown', function (olay) {
      if (olay.key === 'Escape' && menuListesi.classList.contains('acik')) {
        menuyuKapat();
        menuToggle.focus();
      }
    });

    // Geniş ekrana geçilince mobil menü açık kalmasın
    window.addEventListener('resize', function () {
      if (window.innerWidth > 680) menuyuKapat();
    });
  }


  /* ------------------------------------------------------------
     3. EKRANA GİRİNCE BELİRME
     ------------------------------------------------------------
     data-goster taşıyan her öğe, görünür alana girdiğinde
     "gorunur" sınıfını alır. Bir kez göründükten sonra izlemeyi
     bırakıyoruz; yukarı kaydırınca tekrar kaybolması rahatsız edici
     oluyor.
     ------------------------------------------------------------ */
  var gosterilecekler = document.querySelectorAll('[data-goster]');

  if ('IntersectionObserver' in window) {
    var izleyici = new IntersectionObserver(function (girisler) {
      girisler.forEach(function (giris) {
        if (!giris.isIntersecting) return;
        giris.target.classList.add('gorunur');
        izleyici.unobserve(giris.target);
      });
    }, {
      // Öğe ekranın altından biraz içeri girdiğinde tetiklensin
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.05
    });

    gosterilecekler.forEach(function (oge, sira) {
      // Aynı anda beliren öğeler kademeli gelsin (en fazla 6 kademe)
      oge.style.transitionDelay = (Math.min(sira, 6) * 55) + 'ms';
      izleyici.observe(oge);
    });
  } else {
    // IntersectionObserver desteklenmiyorsa içerik gizli kalmasın
    gosterilecekler.forEach(function (oge) {
      oge.classList.add('gorunur');
    });
  }


  /* ------------------------------------------------------------
     4. MENÜDE ETKİN BÖLÜM
     ------------------------------------------------------------
     Bu iş için IntersectionObserver yerine kaydırma konumu
     kullanıyoruz: bölümler farklı yükseklikte olduğu için
     "hangisi daha çok görünüyor" hesabı yanıltıcı olabiliyor.
     Burada menü çizgisinin hemen altındaki bölüm etkin sayılıyor.
     ------------------------------------------------------------ */
  var menuLinkleri = Array.prototype.slice.call(
    document.querySelectorAll('.ustmenu__link:not(.ustmenu__link--dis)')
  );

  var bolumler = menuLinkleri.map(function (link) {
    var kimlik = link.getAttribute('href');
    return kimlik && kimlik.charAt(0) === '#'
      ? document.querySelector(kimlik)
      : null;
  });

  function etkinBolumuIsaretle() {
    if (!menuLinkleri.length) return;

    var menuYuk = ustmenu ? ustmenu.offsetHeight : 68;
    var cizgi   = window.scrollY + menuYuk + 24;
    var etkin   = -1;

    for (var i = 0; i < bolumler.length; i++) {
      var bolum = bolumler[i];
      if (bolum && bolum.offsetTop <= cizgi) etkin = i;
    }

    // Sayfanın en altındaysak son bölüm etkin olsun; kısa son
    // bölümlerde vurgu hiç gelmiyordu.
    var enAlttaMi = window.innerHeight + window.scrollY >=
                    document.body.offsetHeight - 4;
    if (enAlttaMi) etkin = bolumler.length - 1;

    menuLinkleri.forEach(function (link, i) {
      link.classList.toggle('etkin', i === etkin);
    });
  }

  // Sayfa yenilendiğinde ortadan açılmış olabilir; ilk durumu kur.
  kaydirmaDurumu();
})();
