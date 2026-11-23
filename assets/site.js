/* ENG4U group site: the torch, the dust in the doorways, and the walk into the light. */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cave = document.querySelector(".cave");

  /* ---- The light you carry: it follows the pointer and picks out the carvings ---- */
  if (cave && !reduceMotion.matches) {
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      cave.style.setProperty("--tx", `${x}px`);
      cave.style.setProperty("--ty", `${y}px`);
    };
    cave.addEventListener("pointermove", (event) => {
      const box = cave.getBoundingClientRect();
      x = event.clientX - box.left;
      y = event.clientY - box.top;
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ---- Dust in the daylight ---- */
  if (!reduceMotion.matches) {
    document.querySelectorAll(".door__motes").forEach((box, index) => {
      let seed = 7919 * (index + 3);
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const count = window.innerWidth < 760 ? 10 : 18;
      for (let i = 0; i < count; i += 1) {
        const mote = document.createElement("span");
        mote.className = "mote";
        mote.style.left = `${8 + rand() * 84}%`;
        mote.style.top = `${10 + rand() * 80}%`;
        mote.style.setProperty("--d", `${(1 + rand() * 2.1).toFixed(2)}px`);
        mote.style.setProperty("--t", `${(8 + rand() * 10).toFixed(2)}s`);
        mote.style.setProperty("--delay", `${(-rand() * 18).toFixed(2)}s`);
        mote.style.setProperty("--dx", `${((rand() - 0.5) * 46).toFixed(1)}px`);
        mote.style.setProperty("--dy", `${(-(12 + rand() * 46)).toFixed(1)}px`);
        mote.style.setProperty("--o", (0.3 + rand() * 0.55).toFixed(2));
        box.appendChild(mote);
      }
    });
  }

  /* ---- Walking out through a door: zoom into the doorway, white out, then go ---- */
  const overlay = document.querySelector(".whiteout");
  const archSvg = overlay && overlay.querySelector(".whiteout__arch");
  const archPath = archSvg && archSvg.querySelector("path");
  const flash = overlay && overlay.querySelector(".whiteout__flash");
  const notOpen = document.getElementById("door-not-open");
  const notOpenBack = notOpen && notOpen.querySelector(".not-open__back");
  const whoSlot = notOpen && notOpen.querySelector("[data-who-slot]");
  let busy = false;
  let lastTrigger = null;

  const doorFor = (el) => (el.classList.contains("door") ? el : document.querySelector(`.door--${el.dataset.door}`));

  const reset = () => {
    if (!overlay) return;
    overlay.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    overlay.classList.remove("is-on");
    overlay.style.opacity = "";
    if (notOpen) notOpen.hidden = true;
    busy = false;
  };

  const showNotOpen = (trigger) => {
    if (!notOpen) return;
    const who = trigger.dataset.who;
    if (whoSlot) whoSlot.textContent = who ? `${who}'s` : "This";
    notOpen.hidden = false;
    notOpenBack.focus({ preventScroll: true });
  };

  const backIntoTheCave = () => {
    if (!overlay) return;
    const done = () => {
      reset();
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    };
    if (notOpen) notOpen.hidden = true;
    if (reduceMotion.matches) return done();
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-out", fill: "forwards" })
      .finished.then(done, done);
  };

  const walkOut = (trigger, href, instant) => {
    busy = true;
    lastTrigger = trigger;
    const door = doorFor(trigger) || trigger;
    const frame = door.querySelector(".door__frame");
    const source = door.querySelector(".door__arch path");
    archPath.setAttribute("d", source.getAttribute("d"));

    let box = frame.getBoundingClientRect();
    const offscreen = box.bottom < 0 || box.top > window.innerHeight;
    if (offscreen) {
      // clicked from further down the page: open a doorway in the middle of the screen instead
      const w = Math.min(window.innerWidth * 0.18, 180);
      box = { left: window.innerWidth / 2 - w / 2, top: window.innerHeight / 2 - w * 1.24, width: w, height: w * 2 };
    }
    Object.assign(archSvg.style, {
      left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
    });
    overlay.classList.add("is-on");

    const finish = () => {
      if (href) window.location.assign(href);
      else showNotOpen(trigger);
    };

    if (instant || reduceMotion.matches) {
      flash.animate([{ opacity: 0 }, { opacity: 1 }], { duration: instant ? 1 : 240, fill: "forwards" })
        .finished.then(finish, finish);
      return;
    }

    const scale = Math.max(window.innerWidth / box.width, window.innerHeight / box.height) * 2.4;
    const originX = box.left + box.width / 2;
    const originY = box.top + box.height * 0.62;
    const dx = window.innerWidth / 2 - originX;
    const dy = window.innerHeight / 2 - originY;

    archSvg.animate(
      [{ transform: "translate(0, 0) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }],
      { duration: 1350, easing: "cubic-bezier(0.65, 0, 0.25, 1)", fill: "forwards" },
    );
    flash.animate(
      [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 1 }],
      { duration: 1450, easing: "ease-in", fill: "forwards" },
    ).finished.then(finish, finish);
  };

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-exit]");
    if (!trigger || !overlay) return;
    const pending = trigger.hasAttribute("data-pending");
    const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    // a real link opened in a new tab, or from the keyboard, just goes there
    const fromKeyboard = event.detail === 0;
    if (!pending && (modified || fromKeyboard)) return;
    event.preventDefault();
    if (busy) return;
    walkOut(trigger, pending ? null : trigger.getAttribute("href"), fromKeyboard);
  });

  if (notOpenBack) notOpenBack.addEventListener("click", backIntoTheCave);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && notOpen && !notOpen.hidden) backIntoTheCave();
  });

  // coming back with the browser's Back button: put the cave back the way it was
  window.addEventListener("pageshow", (event) => { if (event.persisted) reset(); });
})();
