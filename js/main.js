"use strict";

// JS 有効時のみアニメーション用の初期状態を適用
document.documentElement.classList.add("is-js");

/*-------------------------
  ハンバーガーメニュー
-------------------------*/
(() => {
  const button = document.querySelector(".js-hamburger");
  const drawer = document.querySelector(".js-drawer");
  if (!button || !drawer) return;

  const setOpen = (isOpen) => {
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
    drawer.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("is-drawer-open", isOpen);
  };

  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // PC 幅に戻ったら閉じる
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
})();

/*-------------------------
  スクロールでフェードイン（.js-inview → .is-inview）
-------------------------*/
(() => {
  const targets = document.querySelectorAll(".js-inview");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        obs.unobserve(entry.target); // 1回だけ
      });
    },
    { rootMargin: "0px 0px -15% 0px" }
  );

  targets.forEach((el) => observer.observe(el));
})();

/*-------------------------
  追従ロゴの停止位置：ABOUT のロゴスペースに合わせる
  （PC はロゴが下揃え、SP は上にあるため実測して CSS 変数へ渡す）
-------------------------*/
(() => {
  const visual = document.querySelector(".p-top-visual");
  const space = document.querySelector(".p-about__logo-space");
  if (!visual || !space) return;

  const update = () => {
    const stop = visual.getBoundingClientRect().bottom - space.getBoundingClientRect().bottom;
    visual.style.setProperty("--logo-stop", `${Math.round(stop)}px`);
  };

  update();
  new ResizeObserver(update).observe(visual);
})();

/*-------------------------
  追従ロゴ：ABOUT に重なったらカラーに切り替え
  （追従・停止は CSS の position: sticky で実装）
-------------------------*/
(() => {
  const logo = document.querySelector(".js-logo-mark");
  const about = document.querySelector(".p-about");
  if (!logo || !about) return;

  let observer;

  // ロゴの縦中央の1ラインを判定領域にし、ABOUT がそこに重なったらカラーに
  const observe = () => {
    observer?.disconnect();
    // sticky の top 値（追従中の表示位置）から算出
    const top = parseFloat(getComputedStyle(logo).top) || 0;
    const center = Math.round(top + logo.offsetHeight / 2);
    const bottom = Math.max(window.innerHeight - center - 1, 0);

    observer = new IntersectionObserver(
      ([entry]) => logo.classList.toggle("is-colored", entry.isIntersecting),
      { rootMargin: `-${center}px 0px -${bottom}px 0px` }
    );
    observer.observe(about);
  };

  observe();
  window.addEventListener("resize", observe);
})();

/*-------------------------
  動きを減らす設定のときは動画を止める
-------------------------*/
(() => {
  const video = document.querySelector(".js-hero-video");
  if (!video) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.removeAttribute("autoplay");
    video.pause();
  }
})();

/*-------------------------
  工程ブロック（SP）：写真の高さを本文に合わせる
  本文は写真の斜めに沿って回り込むため、写真の高さで本文の高さも変わる。
  本文が写真の下に回り込まなくなるまで、数回測り直して合わせる
-------------------------*/
(() => {
  // 高さの変数は .c-process で組み立てているため、同じ要素に値を渡す
  const items = document.querySelectorAll(".c-process");
  if (!items.length) return;

  const mq = window.matchMedia("(max-width: 1023px)");

  const fit = (item) => {
    const media = item.querySelector(".c-process__media");
    const text = item.querySelector(".c-process__text");
    if (!media || !text) return;

    item.style.removeProperty("--process-photo-fit");
    if (!mq.matches) return;

    for (let i = 0; i < 8; i += 1) {
      const photo = media.offsetHeight;
      const textHeight = text.offsetHeight;
      if (textHeight <= photo) break; // 写真の横に収まった
      item.style.setProperty("--process-photo-fit", `${Math.ceil(textHeight)}px`);
    }
  };

  const fitAll = () => items.forEach(fit);

  // 幅が変わったときだけ測り直す（高さの変化で再実行しない）
  let lastWidth = 0;
  new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width;
    if (width === lastWidth) return;
    lastWidth = width;
    fitAll();
  }).observe(document.documentElement);

  mq.addEventListener("change", fitAll);
  document.fonts?.ready.then(fitAll);
})();

/*-------------------------
  お問い合わせフォーム：送信前の入力チェックと、選択したファイル名の表示
  ※ 実際の送信と自動返信メールはサーバー側の送信プログラムで行う
-------------------------*/
(() => {
  const form = document.querySelector(".js-form");
  if (!form) return;

  const fileInput = form.querySelector(".js-file-input");
  const fileName = document.getElementById("contact-file-name");
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

  const setError = (input, message) => {
    const id = input.id || `contact-${input.name}`;
    const error = document.getElementById(`${id}-error`);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) {
      error.textContent = message;
      if (message) input.setAttribute("aria-describedby", error.id);
    }
  };

  const checkFile = () => {
    const file = fileInput?.files[0];
    if (!file) return "";
    if (!allowedTypes.includes(file.type)) return "jpg・png・pdf のファイルを選択してください。";
    if (file.size > Number(fileInput.dataset.maxSize)) return "ファイルサイズは 5MB 以内にしてください。";
    return "";
  };

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileName.textContent = file ? file.name : "選択されていません";
    const message = checkFile();
    const error = document.getElementById("contact-file-error");
    if (error) error.textContent = message;
    if (message) fileInput.value = "";
    if (message) fileName.textContent = "選択されていません";
  });

  const validate = (input) => {
    if (input.type === "checkbox") {
      setError(input, input.checked ? "" : "プライバシーポリシーへの同意が必要です。");
      return input.checked;
    }
    if (input.validity.valueMissing) {
      setError(input, "入力してください。");
      return false;
    }
    if (input.validity.typeMismatch) {
      setError(input, "メールアドレスの形式で入力してください。");
      return false;
    }
    setError(input, "");
    return true;
  };

  const required = [...form.querySelectorAll("[required]")];

  // 一度エラーになった項目は、入力のたびに再チェック
  required.forEach((input) => {
    input.addEventListener(input.type === "checkbox" ? "change" : "input", () => {
      if (input.getAttribute("aria-invalid") === "true") validate(input);
    });
  });

  form.addEventListener("submit", (e) => {
    const results = required.map(validate);
    const firstInvalid = required[results.indexOf(false)];
    if (firstInvalid) {
      e.preventDefault();
      firstInvalid.focus();
      return;
    }
    form.querySelector('[type="submit"]').disabled = true; // 二重送信を防ぐ
  });
})();

/*-------------------------
  社員インタビュー：社員カード（と PC の丸印）で表示するインタビューを切り替える
  PC：常に 1 人分を表示 / SP：タップしたカードの下に開き、もう一度タップで閉じる
-------------------------*/
(() => {
  const viewer = document.querySelector(".js-interview-viewer");
  if (!viewer) return;

  const panels = [...viewer.querySelectorAll(".js-interview-panel")];
  const triggers = [...viewer.querySelectorAll(".js-interview-trigger")];
  const mq = window.matchMedia("(min-width: 1024px)");

  // id が null のときはすべて閉じる（SP のみ）
  const show = (id) => {
    panels.forEach((panel) => panel.classList.toggle("is-open", panel.id === id));
    triggers.forEach((trigger) => {
      const isCurrent = trigger.getAttribute("aria-controls") === id;
      trigger.classList.toggle("is-current", isCurrent);
      if (trigger.hasAttribute("aria-expanded")) {
        trigger.setAttribute("aria-expanded", String(isCurrent));
      } else if (isCurrent) {
        trigger.setAttribute("aria-current", "true");
      } else {
        trigger.removeAttribute("aria-current");
      }
    });
  };

  const currentId = () => panels.find((panel) => panel.classList.contains("is-open"))?.id ?? null;

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const id = trigger.getAttribute("aria-controls");

      if (mq.matches) {
        show(id);
        return;
      }

      // SP：開いているカードをもう一度タップしたら閉じる
      show(currentId() === id ? null : id);

      // 上の本文が閉じてカードが画面外へ動いた場合は、カードの位置まで戻す
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 0;
      if (trigger.getBoundingClientRect().top < header) {
        trigger.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // SP は一覧だけを表示した状態から始め、PC では必ず 1 人分を表示
  const sync = () => {
    if (mq.matches && !currentId()) show(panels[0].id);
    if (!mq.matches) show(null);
  };

  sync();
  mq.addEventListener("change", sync);
})();
