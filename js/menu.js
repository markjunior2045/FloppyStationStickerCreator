// Classic menu bar: click a title to open its popup; while one is open,
// hovering another title switches to it. Items call onAction(action).

export function initMenuBar(menuBar, onAction) {
  const menus = [...menuBar.querySelectorAll('.menu')];
  let openMenu = null;

  function setOpen(menu) {
    if (openMenu === menu) return;
    if (openMenu) {
      openMenu.classList.remove('open');
      openMenu.querySelector('.menu-title').setAttribute('aria-expanded', 'false');
    }
    openMenu = menu;
    if (menu) {
      menu.classList.add('open');
      menu.querySelector('.menu-title').setAttribute('aria-expanded', 'true');
    }
  }

  for (const menu of menus) {
    const title = menu.querySelector('.menu-title');
    title.addEventListener('click', () => setOpen(openMenu === menu ? null : menu));
    title.addEventListener('mouseenter', () => { if (openMenu) setOpen(menu); });
  }

  menuBar.addEventListener('click', (event) => {
    const item = event.target.closest('[role="menuitem"]');
    if (!item || item.disabled) return;
    setOpen(null);
    onAction(item.dataset.action);
  });

  document.addEventListener('pointerdown', (event) => {
    if (openMenu && !menuBar.contains(event.target)) setOpen(null);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(null);
  });
}
