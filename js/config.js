/* Настройки на картата – ключовете се вписват между кавичките, после се презарежда страницата.
 *
 * cartoKey     – светла карта (CARTO). Безплатен ключ за нетърговски проекти: https://www.carto.com/basemaps/apikey/
 *                Без ключ слоят „Светла (CARTO)“ не се показва (иначе плочките са с надпис „API KEY REQUIRED“).
 * maptilerKey  – по желание: улици, сателит и терен (MapTiler). Ключ: https://cloud.maptiler.com/account/keys/
 *
 * Ключовете се виждат в кода на страницата – по възможност ги ограничи до домейна на сайта.
 * Без ключове работят OpenStreetMap и OpenTopoMap. */
window.MAP_CONFIG = {
  cartoKey: 'cb1_4d5v_1_516c00cbef879c487208e314',
  maptilerKey: ''
};
