"""Real disclosure/selection actions; old assertions still check saved game values."""
from playwright.sync_api import expect

def inspect_pet(page,pet_id):
 if page.locator('#petDetailDialog').is_visible():page.locator('#closePetDetail').click()
 page.locator(f'[data-inspect="{pet_id}"]').click()
 expect(page.locator('#petDetailDialog')).to_be_visible()
 return page.locator('#petDetail')

def pet_action(page,pet_id,action):
 detail=inspect_pet(page,pet_id)
 detail.locator(f'[data-action="{action}"]').click()
 if page.locator('#petDetailDialog').is_visible():page.locator('#closePetDetail').click()

def select_pet(page,pet_id):
 detail=inspect_pet(page,pet_id);detail.locator('[data-select]').check();page.locator('#closePetDetail').click()

def inventory_control(page,selector):
 details=page.locator('.inventory-tools')
 if details.get_attribute('open') is None:details.locator(':scope > summary').click()
 return page.locator(selector)

def hatch_control(page,selector):
 details=page.locator('.hatch-options')
 if details.get_attribute('open') is None:details.locator(':scope > summary').click()
 return page.locator(selector)
