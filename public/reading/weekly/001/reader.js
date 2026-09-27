const englishIssue = document.documentElement.lang.startsWith('en');
const imageDialog = document.querySelector('#image-viewer');
const viewerImage = document.querySelector('#viewer-image');
const viewerCaption = document.querySelector('#viewer-caption');
const viewerSource = document.querySelector('#viewer-source');
const imageSizeButton = document.querySelector('#image-size');
let imageOpener = null;

document.querySelectorAll('.figure-open').forEach((button) => {
  button.addEventListener('click', () => {
    const figure = button.closest('figure');
    const sourceImage = figure.querySelector('img');
    const sourceLink = figure.querySelector('.source-credit');
    imageOpener = button;
    viewerImage.src = sourceImage.currentSrc || sourceImage.src;
    viewerImage.alt = sourceImage.alt;
    viewerImage.style.setProperty('--image-width', `${sourceImage.getAttribute('width')}px`);
    viewerCaption.textContent = figure.querySelector('figcaption p').textContent;
    viewerSource.href = sourceLink.href;
    imageDialog.classList.remove('is-natural');
    imageSizeButton.textContent = (englishIssue ? 'Original size' : '原尺寸');
    imageSizeButton.setAttribute('aria-pressed', 'false');
    document.body.classList.add('reading-image');
    imageDialog.showModal();
    document.querySelector('#viewer-scroll').scrollTo(0, 0);
  });
});

imageSizeButton.addEventListener('click', () => {
  const natural = imageDialog.classList.toggle('is-natural');
  imageSizeButton.textContent = natural ? (englishIssue ? 'Fit to window' : '适应窗口') : (englishIssue ? 'Original size' : '原尺寸');
  imageSizeButton.setAttribute('aria-pressed', String(natural));
});
document.querySelector('#close-image').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('close', () => {
  document.body.classList.remove('reading-image');
  imageOpener?.focus();
});
