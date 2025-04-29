import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateLinkedPictures,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  createOptimizedPicture,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function decorateSectionBackgrounds(main) {
  main.querySelectorAll('.section[data-background]').forEach((section) => {
    const { background } = section.dataset;
    // if background is a picture, create an optimized picture
    if (background.includes('media_')) { // if background is an embedded image
      const backgroundPicture = createOptimizedPicture(background);
      backgroundPicture.classList.add('section-background-image');
      section.prepend(backgroundPicture);
    } else if (background.startsWith('#')) { // if background is a hex color
      section.style.backgroundColor = background;
    } else if (background.includes('deg')) { // if background is a gradient
      section.setAttribute('style', `background-image: linear-gradient(${background});`);
    }
  });
}

function buildPageDivider(main) {
  const allPageDivider = main.querySelectorAll('code');

  allPageDivider.forEach((el) => {
    const alt = el.innerText.trim();
    const lower = alt.toLowerCase();
    if (lower.startsWith('divider')) {
      if (lower === 'divider' || lower.includes('element')) {
        el.innerText = '';
        el.classList.add('divider');
      }
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // TODO: add auto block, if needed
    buildPageDivider(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Create a new function to prepend this html to the main element
 */
function prependSkipToMainLink(main) {
  const skipToMainLink = document.createElement('a');
  skipToMainLink.href = '#main';
  skipToMainLink.classList.add('skip-to-main-content-link');
  skipToMainLink.innerText = 'Skip to main content';
  main.insertAdjacentElement('beforebegin', skipToMainLink);
}
/**
 * Function to change the color of all <del> elements contained in any heading element
 * and has the color var(--c-navy) to var(--c-citrus) or viceversa, and remove any text decoration
  * @param {Element} main The container element
  */
function changeStrikethroughTextColor(main) {
  const headings = main.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    const strikethroughs = heading.querySelectorAll('del');
    strikethroughs.forEach((strikethrough) => {
      strikethrough.style.textDecoration = 'none';
      const computedColor = window.getComputedStyle(strikethrough).color;
      if (computedColor === 'rgb(0, 75, 110)') { // var(--c-navy) in RGB
        strikethrough.style.color = 'var(--c-citrus)';
      } else if (computedColor === 'rgb(239, 95, 23)') { // var(--c-citrus) in RGB
        strikethrough.style.color = 'var(--c-navy)';
      }
    });
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  decorateLinkedPictures(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateSectionBackgrounds(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    prependSkipToMainLink(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
    changeStrikethroughTextColor(main);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);
  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();
  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
