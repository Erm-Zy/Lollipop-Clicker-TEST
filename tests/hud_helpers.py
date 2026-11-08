"""Legitimate new HUD interactions shared by existing browser regressions."""
def open_shop(page):
 if page.locator('body').get_attribute('data-page')=='home' and not page.locator('#gamePanel').is_visible():
  page.locator('[data-game-panel="shop"]:visible').first.click()
  page.locator('#gamePanel').wait_for(state='visible')
def close_panel(page):
 if page.locator('#gamePanel[open]').count():
  page.locator('#closeGamePanel').click();page.locator('#gamePanel').wait_for(state='hidden')
def select_expansion(page,key):
 page.locator(f'[data-node="{key}"]').click()
 return page.locator(f'[data-expand="{key}"]')
def recipe_filter(page,name):
 details=page.locator('.recipe-filters')
 if details.get_attribute('open') is None:details.locator('summary').click()
 return page.locator(f'[data-filter="{name}"]')
