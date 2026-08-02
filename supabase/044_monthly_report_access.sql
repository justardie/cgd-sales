UPDATE role_access_settings
SET desktop_menus = array_append(desktop_menus, 'monthly_report'), updated_at = NOW()
WHERE role_key IN ('admin', 'hunter')
  AND 'report' = ANY(desktop_menus)
  AND NOT ('monthly_report' = ANY(desktop_menus));
