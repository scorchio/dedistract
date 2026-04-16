function addBanner() {
  const backdrop = toDOM(`
    <div class="dedistract-backdrop"></div>
  `)
  document.body.appendChild(backdrop)
  const banner = toDOM(`
    <div class="dedistract-banner">
      Azt mondtad, ezt nem szeretnéd annyit nézegetni. Klikkelj ide, ha meggondoltad magad.
    </div>
  `)
  document.body.appendChild(banner)
  banner.addEventListener("click", () => {
    let delayInSeconds = 20

    const dialog = toDOM(`
      <div class="dedistract-dialog">
        <div>
          <h1>Szóval... mégis szeretnéd itt múlatni az idődet?</h1>
          <div id="breath-circle"></div>
          <p>Előtte azért végy pár mély levegőt.</p>
          <p>Ha lenne jobb dolgod, akkor még mindig nem késő, csak zárd be ezt az oldalt :)</p>
          <p>Ha viszont biztos vagy benne, hogy szeretnéd feloldani az oldalt, klikkelj és tarts nyomva a bal gombot <span class="dedistract-countdown">${delayInSeconds}</span> másodpercig.</p>
        </div>
      </div>
    `)
    document.body.appendChild(dialog)

    let interval = null
    dialog.addEventListener("mousedown", () => {
      let start = +new Date()
      interval = setInterval(() => {
        const remaining = delayInSeconds - (+new Date() - start) / 1000
        if (remaining < 0) {
          appendDismissalReason(window.location.hostname, "unlocked", new Date(), () => {
            setEnabled(false)
            document.body.removeChild(dialog)
            clearInterval(interval)
          })
        } else {
          document.querySelector(".dedistract-countdown").textContent = remaining.toFixed(0)
        }
      }, 1000)
    })
    dialog.addEventListener("mouseup", () => {
      clearInterval(interval)
    })
  })
}

// Function to retrieve the stored list of dismissal reasons
function retrieveDismissalReasons(callback) {
  chrome.storage.sync.get({ dismissalReasons: [] }, function(result) {
    callback(result.dismissalReasons);
  });
}

// Function to store the updated list of dismissal reasons
function storeDismissalReasons(updatedList, callback) {
  chrome.storage.sync.set({ dismissalReasons: updatedList }, callback);
}

// Function to append a new dismissal reason to the list
function appendDismissalReason(domain, message, time, callback) {
  retrieveDismissalReasons(function(dismissalReasons) {
    console.log("Dismissal reasons", dismissalReasons)
    dismissalReasons.push({ domain: domain, message: message, time: time.toISOString() });
    storeDismissalReasons(dismissalReasons, callback);
  });
}

document.addEventListener('readystatechange', (event) => {
   if (document.readyState === 'interactive') {
        addBanner();
   }
});

// Lots of sites are now single-page apps which use pushState. This makes it
// difficult to make URL-based rules in manifest.json, and there's no API for
// observing history changes due to pushstate (you can observe popstate but not
// pushstate). This file contains the hacks necessary to make it work anyway.
function addPathChangeListener(callback) {
  let lastPathName = null
  function checkURL() {
    let pathName = window.location.pathname
    if (pathName === lastPathName) {
      return
    }
    lastPathName = window.location.pathname
    callback(lastPathName)
  }

  checkURL()

  // We could just poll in a requestAnimationFrame on every frame forever,
  // but that's a lot of unnecessary battery drain. Instead, whenever the
  // user clicks, we'll poll for up to 2 seconds afterwards.
  let frameRequest = null
  function beginPolling() {
    const start = +new Date()

    if (frameRequest != null) {
      // already polling, don't need to do anything.
      return
    }

    ;(function poll() {
      checkURL()
      if ((+new Date()) - start < 2 * 1000) {
        frameRequest = requestAnimationFrame(poll)
      } else {
        frameRequest = null
      }
    })()
  }

  // Whenever the user places their mouse down or hits a key, start polling for
  // URL changes.
  window.addEventListener("mousedown", beginPolling, /* capture = */ true)
  window.addEventListener("keydown", beginPolling, /* capture = */ true)
  window.addEventListener("popstate", beginPolling, /* capture = */ true)
}


const disableClassName = "disable-dedistract"

function setEnabled(enabled) {
  if (enabled) {
    document.body.classList.remove(disableClassName)
  } else {
    document.body.classList.add(disableClassName)
  }
}

function enableFeedOnPathsOtherThan(blockedPaths) {
  addPathChangeListener((path) => {
    if (blockedPaths.includes(path)) {
      console.log("[dedistract] blocking feed for", path)
      setEnabled(true)
    } else {
      console.log("[dedistract] unblocking feed for", path)
      setEnabled(false)
    }
  })
}

function toDOM(str) {
  const container = document.createElement("div")
  container.innerHTML = str
  return container.firstElementChild
}
