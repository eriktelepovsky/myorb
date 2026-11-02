// The tour after setup (tour.py): a guide through the made-up day, one part of the screen at a
// time, with driver.js. It ends only on purpose: with its last button, which leads on to setting
// myOrb up, or by confirming "End the tour". Esc, clicks beside it and closing the page do not
// end it; the step it was on is kept for next time.
(() => {
  const KEY = "myorb-tour-step";
  const name = () => document.querySelector(".core-name")?.textContent.trim() || "myOrb";

  // `pane`: the screen it is on when they are side by side on a phone (welcome.html).
  const steps = () => [
    {
      title: "Welcome to myOrb",
      text: "This is a made-up day, so you can see what myOrb does before you connect anything. Nothing here is yours, and nothing you do here is saved.",
    },
    {
      element: ".orb",
      pane: 1,
      title: "Your day around the orb",
      text: "Each number is one source: unread email, pull requests, tasks, the weather and more. A ▲ marks one that needs you.",
    },
    {
      element: '#orb-widgets [hx-get="/welcome/widget/tasks/open"] .node',
      pane: 1,
      title: "The details behind a number",
      text: "Click a number to open its details: the emails, pull requests or tasks behind it, with actions such as Done or Mark as read. ← and → move on to the next one.",
    },
    {
      element: ".side-left",
      pane: 0,
      title: "Today",
      text: "The day's schedule, your tasks, ticked off right here, and what needs you first.",
    },
    {
      element: ".clock-extra",
      pane: 1,
      title: "When to leave",
      text: "Your next event, and when to leave for it: by car with the traffic expected then, by public transport, or on foot when it is close.",
    },
    {
      element: ".core-brief",
      pane: 1,
      title: "The daily brief",
      text: `Every morning ${name()} writes what matters today, from all your sources. Open it to read it, or have it read aloud.`,
    },
    {
      element: ".command-bar",
      pane: 1,
      title: `Ask ${name()}`,
      text: `Ask anything about your day, typed or spoken. ${name()} answers from your dashboard and adds tasks for you once you agree.`,
    },
    {
      element: ".side-right",
      pane: 2,
      title: "Quick actions and activity",
      text: "The questions you ask often, one click away, asking by voice, and what changed lately in your sources.",
    },
    {
      element: "[data-palette-open]",
      title: "Search everything",
      text: "Find any email, event, task or pull request, and run commands. ⌘K or Ctrl+K opens it from anywhere.",
    },
    {
      element: '.header-nav a[href="/integrations"]',
      title: "Now make it yours",
      text: "Next, connect an AI and your own services, step by step. The made-up day then makes way for yours.",
    },
  ];

  const stored = (count) => {
    try {
      return Math.min(Math.max(0, Number(localStorage.getItem(KEY)) || 0), count - 1);
    } catch {
      return 0;
    }
  };

  const remember = (index) => {
    try {
      if (index === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, String(index));
    } catch {
      // Without storage the tour starts from its first step next time.
    }
  };

  // Phones show one screen of three at a time: the one with the step's part first.
  const narrow = () => {
    const nav = document.querySelector("[data-panes-nav]");
    return nav !== null && getComputedStyle(nav).display !== "none";
  };

  let guide = null;

  // Once the part has slid onto the screen and stopped there (or after a while without), so
  // the box is placed by where it stays.
  const settled = (selector, then) => {
    const since = Date.now();
    let last = null;
    const check = () => {
      const box = selector && document.querySelector(selector)?.getBoundingClientRect();
      const left = box ? Math.round(box.left) : null;
      const inView = box && box.left >= -1 && box.right <= innerWidth + 1;
      if ((inView && left === last) || Date.now() - since > 1500) then();
      else {
        last = left;
        setTimeout(check, 80);
      }
    };
    check();
  };

  const show = (index) => {
    remember(index);
    const go = () => (guide.isActive() ? guide.moveTo(index) : guide.drive(index));
    const step = guide.getConfig().steps[index];
    if (step?.pane !== undefined && narrow()) {
      document.querySelector(`[data-pane="${step.pane}"]`)?.click();
      settled(step.element, go);
    } else {
      go();
    }
  };

  // The end, on purpose: on to the Get started steps, with the user's own data from then on.
  const finish = () => {
    remember(null);
    guide.destroy();
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/tour/finish";
    document.body.append(form);
    form.submit();
  };

  // "End the tour" asks first, in the step's own box, with "Keep going" as the default.
  const confirmEnd = (popover) => {
    popover.title.textContent = "End the tour?";
    popover.description.textContent =
      "You can take it again from Integrations. Next come the steps to set myOrb up.";
    popover.footer.replaceChildren();
    const keep = document.createElement("button");
    keep.type = "button";
    keep.className = "tour-btn tour-primary";
    keep.textContent = "Keep going";
    keep.addEventListener("click", () => guide.moveTo(guide.getActiveIndex() ?? 0));
    const end = document.createElement("button");
    end.type = "button";
    end.className = "tour-btn tour-danger";
    end.textContent = "End the tour";
    end.addEventListener("click", finish);
    popover.footer.append(end, keep);
    keep.focus();
  };

  const start = () => {
    if (!window.driver?.js || !document.getElementById("welcome")) return;
    // Each part is looked up when its step shows; one not on the page leaves the box centered.
    const list = steps().map(({ element, pane, title, text }) => ({
      element,
      pane,
      popover: { title, description: text },
    }));
    guide = window.driver.js.driver({
      steps: list,
      allowClose: false,
      allowKeyboardControl: false,
      disableActiveInteraction: true,
      showButtons: ["next", "previous"],
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Set up myOrb",
      popoverClass: "myorb-tour",
      overlayColor: "#000",
      overlayOpacity: 0.72,
      stagePadding: 6,
      stageRadius: 12,
      onNextClick: () => {
        const index = guide.getActiveIndex() ?? 0;
        if (index >= list.length - 1) finish();
        else show(index + 1);
      },
      onPrevClick: () => show(Math.max(0, (guide.getActiveIndex() ?? 0) - 1)),
      onPopoverRender: (popover) => {
        const end = document.createElement("button");
        end.type = "button";
        end.className = "tour-end";
        end.textContent = "End the tour";
        end.addEventListener("click", () => confirmEnd(popover));
        popover.footer.prepend(end);
      },
    });
    show(stored(list.length));
  };

  // While it runs, keys go only to its box: no shortcut opens anything behind it.
  document.addEventListener(
    "keydown",
    (event) => {
      if (!guide?.isActive() || event.target.closest?.(".driver-popover")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  // Once the numbers around the orb are in place (or after a few seconds without them), so each
  // step finds its part where it stays.
  const begin = () => {
    const since = Date.now();
    const wait = () => {
      const loaded = document.querySelector("#orb-widgets:not([aria-busy])");
      if (loaded || Date.now() - since > 5000) setTimeout(start, 300);
      else setTimeout(wait, 200);
    };
    wait();
  };
  if (document.readyState === "complete") begin();
  else window.addEventListener("load", begin, { once: true });
})();
