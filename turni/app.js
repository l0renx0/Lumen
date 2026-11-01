// Turni — segna entrata e uscita, conta ore, extra e soldi.
// I dati restano solo nel telefono (localStorage), con backup in un file.
(() => {
  'use strict';

  // ---------- Dati ----------
  const KEY = 'turni.v1';
  const DEFAULTS = { weekHours: 20, extraRate: 9, salary: 0, method: 'exact', monthWeeks: {} };

  function normalize(d) {
    const out = {
      shifts: Array.isArray(d && d.shifts) ? d.shifts : [],
      payments: Array.isArray(d && d.payments) ? d.payments : [],
      open: d && d.open && d.open.date && d.open.start ? d.open : null,
      settings: { ...DEFAULTS, ...((d && d.settings) || {}) },
    };
    if (!METHODS[out.settings.method]) out.settings.method = 'exact';
    if (!out.settings.monthWeeks || typeof out.settings.monthWeeks !== 'object') out.settings.monthWeeks = {};
    return out;
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return normalize(null); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast(t('save_fail')); }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Modi in cui l'azienda potrebbe contare le ore (per difetto, come conti tu); i nomi sono in I18N
  const METHODS = { exact: 1, dur30: 1, clock30: 1, clock15: 1 };

  // ---------- Lingue: italiano e spagnolo ----------
  const I18N = {
    it: {
      locale: 'it-IT',
      days: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
      daysLong: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
      months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
      mon: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
      cal: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
      dateLong: (d) => `${I18N.it.daysLong[d.getDay()]} ${d.getDate()} ${I18N.it.months[d.getMonth()]}`,
      methods: {
        exact: ['Al minuto', 'L\'orario esatto. Es. 8:01 → 10:01 = 2 h'],
        dur30: ['Totale a mezz\'ore', 'Il totale del turno arrotondato per difetto alla mezz\'ora. Es. 8:01 → 10:01 = 2 h, 8:01 → 9:59 = 1 h 30'],
        clock30: ['Orari a mezz\'ore', 'Entrata spostata alla mezz\'ora dopo, uscita a quella prima. Es. 8:01 → 10:01 = 1 h 30'],
        clock15: ['Orari a quarti d\'ora', 'Come sopra, ma ogni 15 minuti. Es. 8:01 → 10:01 = 1 h 45'],
      },
      // Testi fissi della pagina (data-i18n)
      tab_oggi: 'Oggi', tab_settimana: 'Settimana', tab_mese: 'Mese', tab_soldi: 'Soldi',
      aria_settings: 'Impostazioni, contratto e backup', aria_add: 'Aggiungi un turno', aria_tabs: 'Sezioni',
      f_day: 'Giorno', f_in: 'Entrata', f_out: 'Uscita', f_split: 'Turno spezzato',
      f_split_sub: 'Esci e poi rientri: le ore in mezzo non sono pagate', f_back: 'Rientro',
      f_note: 'Nota (facoltativa)', f_note_ph: 'Es. inventario, sostituzione…', cancel: 'Annulla', save: 'Salva',
      p_title: 'Soldi ricevuti', p_what: 'Che cosa hai ricevuto?', p_extra: 'Ore extra', p_salary: 'Stipendio (busta paga)',
      p_amount: 'Importo in €', p_date: 'Ricevuti il', p_month: 'Per le ore di', p_note_ph: 'Es. contanti, acconto…',
      s_lang: 'Lingua', s_title: 'Il mio contratto', s_week: 'Ore a settimana', s_rate: 'Paga ora extra (€)',
      s_rule: 'Gli extra si contano sul mese: ore del mese meno <b>ore a settimana × settimane del mese</b> (4 settimane = 80 h, 5 settimane = 100 h). Se un mese l\'azienda conta diversamente, lo cambi dalla sezione Mese.',
      s_salary: 'Stipendio netto in busta paga (€)', s_optional: 'Facoltativo', s_salary_note: 'Serve solo a controllare che arrivi. Puoi lasciarlo vuoto.',
      s_method: 'Come contano entrata e uscita',
      s_method_note: 'Non sai quale usa l\'azienda? Lascia «Al minuto» e segna i soldi che ricevi: nella sezione Soldi ti dico quale conteggio corrisponde.',
      s_backup: 'Backup', s_backup_note: 'I dati restano solo su questo telefono. Ogni tanto salva un backup, così non li perdi se cambi telefono.',
      s_export: 'Salva backup', s_import: 'Importa', s_csv: 'Esporta per Excel', s_done: 'Fatto',
      // Testi delle viste
      save_fail: 'Non riesco a salvare: memoria del browser piena o bloccata',
      w_manual: 'scelto da te', w_sure: 'sicuro', w_doubt: 'nel dubbio',
      contract: 'Contratto', missing: (x) => `Mancano <b>${x}</b>`, full: 'Ore piene',
      pause: (n) => `pausa ${n} min`, exact_h: (x) => `esatte ${x}`, gap: (x) => `spezzato · ${x} non pagate`,
      running: 'in corso', tap_out: 'Tocca per segnare l\'uscita',
      prev: 'Precedente', next: 'Successivo', back_today: 'Torna a oggi',
      weeks_btn: (mo, n, h, lb) => `${mo}: <b>${n} settimane</b> = ${h} (${lb}) · cambia`,
      on_shift: 'In turno', since_day: (d) => ` da ${d}`, in_at: 'Entrata alle', fix: 'correggi',
      too_long: 'Turno molto lungo: hai dimenticato di segnare l\'uscita?', punch_out: 'Segna uscita',
      off_shift: 'Non sei in turno', punch_in: 'Segna entrata',
      punch_hint: 'Tocca appena timbri sul tablet. Se c\'è qualche minuto di differenza, puoi correggere l\'orario subito dopo.',
      recent: 'Ultimi turni', see_all: 'Vedi tutti',
      no_shifts: 'Ancora nessun turno.<br>Segna l\'entrata qui sopra, oppure aggiungi un turno passato con il <b>+</b>.',
      this_week: 'Questa settimana', of: 'su', extra_pill: (x) => `+${x} extra`, missing_pill: (x) => `mancano ${x}`,
      worked: 'Ore lavorate', hours: 'ore', over: (x, w) => ` · <b style="color:var(--money)">+${x}</b> oltre le ${w}`,
      another: '+ altro turno', rest: 'Riposo · tocca per aggiungere',
      this_month: 'Questo mese', shifts: (n) => (n === 1 ? 'turno' : 'turni'), days_n: (n) => (n === 1 ? 'giorno' : 'giorni'),
      week_by_week: 'Settimana per settimana', csv_month: 'Esporta il mese per Excel',
      none_extra: (now) => `Nessuna ora extra${now ? ' per ora' : ''}`,
      none_extra_sub: (x) => `Superate le ${x} del mese, qui vedi quanto ti spetta.`,
      to_get: (x) => `Da ricevere: ${x}`, to_get_sub: 'Quando ti pagano, tocca «Segna soldi ricevuti».',
      all_paid: 'Pagato tutto', all_paid_sub: (x) => `Hai ricevuto ${x}: torna con il conteggio.`,
      missing_eur: (x) => `Mancano ${x}`, got_of: (a, b) => `Ricevuti ${a} su ${b}.`,
      got_more: (x) => `Ricevuti ${x} in più`, got_more_sub: (a, b) => `Ricevuti ${a}, il conteggio dice ${b}.`,
      contract_hours: 'Ore da contratto', weeks_x: (n, w, lb) => `${n} settimane × ${w} (${lb})`, change: 'cambia',
      extra_hours: 'Ore extra', per_hour: (x) => `× ${x} all'ora`,
      if_weeks: (n) => `Se conta ${n} settimane`, in_use: 'in uso', matches: 'torna con i soldi ricevuti',
      from_contract: (a, b) => `${a} da contratto · ${b} extra`, worked_extra: (a, b) => `${a} lavorate · ${b} extra`,
      salary_title: 'Stipendio in busta paga', salary_contract: 'Da contratto (netto)', received: 'Ricevuto',
      month_total: 'Totale del mese (stipendio + extra)', k_extra: 'Ore extra', k_salary: 'Stipendio',
      got_on: (d) => `Ricevuti il ${d}`, del: 'Elimina', no_pays: 'Nessun pagamento segnato per questo mese.',
      extra_of: (mo) => `Extra di ${mo}`,
      hero_sub: (x, r, n, now) => `${x} extra × ${r} all'ora · ${n} settimane${now ? ' · mese in corso' : ''}`,
      add_pay: 'Segna soldi ricevuti', owed: 'In tutto ti devono ancora', all_months: 'Tutti i mesi', incl_now: ', compreso quello in corso',
      four_five: '4 o 5 settimane?', w_hint_manual: 'Hai scelto tu il numero di settimane per questo mese.',
      w_hint_sure: (mo) => `${mo} ha 4 settimane con qualsiasi criterio.`,
      w_hint_doubt: 'Non è sicuro se l\'azienda conti 4 o 5 settimane: nel dubbio uso 5, che dà il conto più basso. Se ti pagano la cifra da 4 settimane, te lo dico qui.',
      w_hint_tap: 'Tocca una riga per sceglierla.', calc: 'Il calcolo', other_ways: 'Se contano le ore in un altro modo',
      methods_hint: 'Tocca un conteggio per usarlo in tutta l\'app. Quando segni i soldi ricevuti, ti dico quale conteggio corrisponde.',
      got_for: (mo) => `Soldi ricevuti per ${mo}`,
      eyebrow_money: 'Ore extra e pagamenti',
      t_weeks: (mo, n, h) => `${mo}: ${n} settimane = ${h} da contratto`, t_method: (x) => `Ora conto «${x}»`,
      t_pay_del: 'Pagamento eliminato', undo: 'Annulla', t_in: (x) => `Entrata segnata alle ${x}`, fix_btn: 'Correggi',
      cancel_in: 'Annulla entrata', delete: 'Elimina', end_shift: 'Fine turno', fix_in: 'Correggi entrata',
      edit_shift: 'Modifica turno', new_shift: 'Nuovo turno', presets: 'Orari che usi spesso',
      pv_in: 'Scrivi l\'orario di entrata', pv_also_out: 'Scrivi anche l\'uscita<small>Hai già un turno in corso.</small>',
      pv_running: 'Turno in corso<small>Lascia vuota l\'uscita e segnala dopo con «Segna uscita».</small>',
      pv_back: 'Scrivi l\'orario di rientro e di uscita', pv_order: 'Il rientro deve essere dopo la prima uscita',
      pv_split: (a, b, g) => `${a} + ${b} · ${g} di spezzato non pagate. `, pv_next_day: 'Finisce il giorno dopo. ',
      pv_total: (x, d) => `Totale: ${x} <span style="font-weight:500">(${d} ore)</span>`,
      pv_method: (m, x) => `Con il conteggio «${m}»: ${x}.`,
      t_four: 'Scrivi tutti e quattro gli orari', t_split_saved: (x) => `Turno spezzato salvato · ${x}`,
      t_need_out: 'Scrivi anche l\'orario di uscita', t_running: (x) => `Turno in corso dalle ${x}`,
      t_same: 'Entrata e uscita sono uguali', t_updated: 'Turno aggiornato', t_saved: (x) => `Turno salvato · ${x}`,
      t_in_cancel: 'Entrata annullata', restore: 'Ripristina', t_deleted: 'Turno eliminato',
      t_amount: 'Scrivi l\'importo ricevuto', t_paid: (x) => `Segnati ${x}`,
      csv: ['Data', 'Giorno', 'Entrata', 'Uscita', 'Ore esatte'], csv_h: (m) => `Ore (${m})`, csv_note: 'Nota', csv_total: 'Totale',
      t_empty: 'Non ci sono ancora turni', t_backup: 'Backup salvato nei download',
      t_loaded: (n) => `Caricati ${n} turni`, t_have_all: 'Hai già tutti questi turni',
      c_merge: (n, p) => `Aggiungo ${n} turni${p ? ` e ${p} pagamenti` : ''} a quelli che hai già? Quelli uguali non vengono duplicati.`,
      t_added: (n) => `Aggiunti ${n} turni`, t_bad_file: 'Questo file non è un backup di Turni',
      t_lang: 'Lingua: italiano',
    },
    es: {
      locale: 'es-ES',
      days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      daysLong: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
      months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      mon: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
      cal: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      dateLong: (d) => `${I18N.es.daysLong[d.getDay()]} ${d.getDate()} de ${I18N.es.months[d.getMonth()]}`,
      methods: {
        exact: ['Al minuto', 'La hora exacta. Ej. 8:01 → 10:01 = 2 h'],
        dur30: ['Total en medias horas', 'El total del turno redondeado a la baja a la media hora. Ej. 8:01 → 10:01 = 2 h, 8:01 → 9:59 = 1 h 30'],
        clock30: ['Fichajes a la media hora', 'La entrada pasa a la media hora siguiente y la salida a la anterior. Ej. 8:01 → 10:01 = 1 h 30'],
        clock15: ['Fichajes al cuarto de hora', 'Igual que arriba, pero cada 15 minutos. Ej. 8:01 → 10:01 = 1 h 45'],
      },
      tab_oggi: 'Hoy', tab_settimana: 'Semana', tab_mese: 'Mes', tab_soldi: 'Dinero',
      aria_settings: 'Ajustes, contrato y copia de seguridad', aria_add: 'Añadir un turno', aria_tabs: 'Secciones',
      f_day: 'Día', f_in: 'Entrada', f_out: 'Salida', f_split: 'Turno partido',
      f_split_sub: 'Sales y luego vuelves: las horas de en medio no se pagan', f_back: 'Vuelta',
      f_note: 'Nota (opcional)', f_note_ph: 'Ej. inventario, sustitución…', cancel: 'Cancelar', save: 'Guardar',
      p_title: 'Dinero recibido', p_what: '¿Qué has recibido?', p_extra: 'Horas extra', p_salary: 'Sueldo (nómina)',
      p_amount: 'Importe en €', p_date: 'Recibido el', p_month: 'Por las horas de', p_note_ph: 'Ej. efectivo, anticipo…',
      s_lang: 'Idioma', s_title: 'Mi contrato', s_week: 'Horas por semana', s_rate: 'Pago hora extra (€)',
      s_rule: 'Las extras se cuentan por mes: horas del mes menos <b>horas por semana × semanas del mes</b> (4 semanas = 80 h, 5 semanas = 100 h). Si un mes la empresa cuenta distinto, lo cambias desde la sección Mes.',
      s_salary: 'Sueldo neto en nómina (€)', s_optional: 'Opcional', s_salary_note: 'Solo sirve para comprobar que llegue. Puedes dejarlo vacío.',
      s_method: 'Cómo cuentan la entrada y la salida',
      s_method_note: '¿No sabes cuál usa la empresa? Deja «Al minuto» y anota el dinero que recibes: en la sección Dinero te digo cuál cuadra.',
      s_backup: 'Copia de seguridad', s_backup_note: 'Los datos se quedan solo en este móvil. De vez en cuando guarda una copia, así no los pierdes si cambias de móvil.',
      s_export: 'Guardar copia', s_import: 'Importar', s_csv: 'Exportar a Excel', s_done: 'Hecho',
      save_fail: 'No puedo guardar: la memoria del navegador está llena o bloqueada',
      w_manual: 'elegido por ti', w_sure: 'seguro', w_doubt: 'en la duda',
      contract: 'Contrato', missing: (x) => `Faltan <b>${x}</b>`, full: 'Horas completas',
      pause: (n) => `pausa ${n} min`, exact_h: (x) => `exactas ${x}`, gap: (x) => `partido · ${x} sin pagar`,
      running: 'en curso', tap_out: 'Toca para fichar la salida',
      prev: 'Anterior', next: 'Siguiente', back_today: 'Volver a hoy',
      weeks_btn: (mo, n, h, lb) => `${mo}: <b>${n} semanas</b> = ${h} (${lb}) · cambiar`,
      on_shift: 'Trabajando', since_day: (d) => ` desde el ${d}`, in_at: 'Entrada a las', fix: 'corregir',
      too_long: 'Turno muy largo: ¿olvidaste fichar la salida?', punch_out: 'Fichar salida',
      off_shift: 'No estás trabajando', punch_in: 'Fichar entrada',
      punch_hint: 'Tócalo justo cuando fiches en la tablet. Si hay algún minuto de diferencia, puedes corregir la hora justo después.',
      recent: 'Últimos turnos', see_all: 'Ver todos',
      no_shifts: 'Todavía no hay turnos.<br>Ficha la entrada aquí arriba, o añade un turno pasado con el <b>+</b>.',
      this_week: 'Esta semana', of: 'de', extra_pill: (x) => `+${x} extra`, missing_pill: (x) => `faltan ${x}`,
      worked: 'Horas trabajadas', hours: 'horas', over: (x, w) => ` · <b style="color:var(--money)">+${x}</b> más de las ${w}`,
      another: '+ otro turno', rest: 'Descanso · toca para añadir',
      this_month: 'Este mes', shifts: (n) => (n === 1 ? 'turno' : 'turnos'), days_n: (n) => (n === 1 ? 'día' : 'días'),
      week_by_week: 'Semana a semana', csv_month: 'Exportar el mes a Excel',
      none_extra: (now) => `Ninguna hora extra${now ? ' por ahora' : ''}`,
      none_extra_sub: (x) => `Cuando pases las ${x} del mes, aquí verás cuánto te toca.`,
      to_get: (x) => `Por cobrar: ${x}`, to_get_sub: 'Cuando te paguen, toca «Anotar dinero recibido».',
      all_paid: 'Todo pagado', all_paid_sub: (x) => `Has recibido ${x}: cuadra con la cuenta.`,
      missing_eur: (x) => `Faltan ${x}`, got_of: (a, b) => `Recibidos ${a} de ${b}.`,
      got_more: (x) => `Recibidos ${x} de más`, got_more_sub: (a, b) => `Recibidos ${a}, la cuenta dice ${b}.`,
      contract_hours: 'Horas de contrato', weeks_x: (n, w, lb) => `${n} semanas × ${w} (${lb})`, change: 'cambiar',
      extra_hours: 'Horas extra', per_hour: (x) => `× ${x} la hora`,
      if_weeks: (n) => `Si cuenta ${n} semanas`, in_use: 'en uso', matches: 'cuadra con el dinero recibido',
      from_contract: (a, b) => `${a} de contrato · ${b} extra`, worked_extra: (a, b) => `${a} trabajadas · ${b} extra`,
      salary_title: 'Sueldo en nómina', salary_contract: 'Según contrato (neto)', received: 'Recibido',
      month_total: 'Total del mes (sueldo + extra)', k_extra: 'Horas extra', k_salary: 'Sueldo',
      got_on: (d) => `Recibidos el ${d}`, del: 'Eliminar', no_pays: 'No hay pagos anotados para este mes.',
      extra_of: (mo) => `Extra de ${mo}`,
      hero_sub: (x, r, n, now) => `${x} extra × ${r} la hora · ${n} semanas${now ? ' · mes en curso' : ''}`,
      add_pay: 'Anotar dinero recibido', owed: 'En total todavía te deben', all_months: 'Todos los meses', incl_now: ', incluido el actual',
      four_five: '¿4 o 5 semanas?', w_hint_manual: 'Has elegido tú el número de semanas de este mes.',
      w_hint_sure: (mo) => `${mo} tiene 4 semanas con cualquier criterio.`,
      w_hint_doubt: 'No está claro si la empresa cuenta 4 o 5 semanas: en la duda uso 5, que da la cuenta más baja. Si te pagan la cifra de 4 semanas, te lo digo aquí.',
      w_hint_tap: 'Toca una fila para elegirla.', calc: 'El cálculo', other_ways: 'Si cuentan las horas de otra forma',
      methods_hint: 'Toca una forma de contar para usarla en toda la app. Cuando anotes el dinero recibido, te digo cuál cuadra.',
      got_for: (mo) => `Dinero recibido de ${mo}`,
      eyebrow_money: 'Horas extra y pagos',
      t_weeks: (mo, n, h) => `${mo}: ${n} semanas = ${h} de contrato`, t_method: (x) => `Ahora cuento «${x}»`,
      t_pay_del: 'Pago eliminado', undo: 'Deshacer', t_in: (x) => `Entrada fichada a las ${x}`, fix_btn: 'Corregir',
      cancel_in: 'Anular entrada', delete: 'Eliminar', end_shift: 'Fin del turno', fix_in: 'Corregir entrada',
      edit_shift: 'Editar turno', new_shift: 'Nuevo turno', presets: 'Horarios que usas a menudo',
      pv_in: 'Escribe la hora de entrada', pv_also_out: 'Escribe también la salida<small>Ya tienes un turno en curso.</small>',
      pv_running: 'Turno en curso<small>Deja la salida vacía y fíchala después con «Fichar salida».</small>',
      pv_back: 'Escribe la hora de vuelta y de salida', pv_order: 'La vuelta tiene que ser después de la primera salida',
      pv_split: (a, b, g) => `${a} + ${b} · ${g} de turno partido sin pagar. `, pv_next_day: 'Termina al día siguiente. ',
      pv_total: (x, d) => `Total: ${x} <span style="font-weight:500">(${d} horas)</span>`,
      pv_method: (m, x) => `Contando «${m}»: ${x}.`,
      t_four: 'Escribe las cuatro horas', t_split_saved: (x) => `Turno partido guardado · ${x}`,
      t_need_out: 'Escribe también la hora de salida', t_running: (x) => `Turno en curso desde las ${x}`,
      t_same: 'La entrada y la salida son iguales', t_updated: 'Turno actualizado', t_saved: (x) => `Turno guardado · ${x}`,
      t_in_cancel: 'Entrada anulada', restore: 'Recuperar', t_deleted: 'Turno eliminado',
      t_amount: 'Escribe el importe recibido', t_paid: (x) => `Anotados ${x}`,
      csv: ['Fecha', 'Día', 'Entrada', 'Salida', 'Horas exactas'], csv_h: (m) => `Horas (${m})`, csv_note: 'Nota', csv_total: 'Total',
      t_empty: 'Todavía no hay turnos', t_backup: 'Copia guardada en descargas',
      t_loaded: (n) => `Cargados ${n} turnos`, t_have_all: 'Ya tienes todos estos turnos',
      c_merge: (n, p) => `¿Añado ${n} turnos${p ? ` y ${p} pagos` : ''} a los que ya tienes? Los iguales no se duplican.`,
      t_added: (n) => `Añadidos ${n} turnos`, t_bad_file: 'Este archivo no es una copia de Turni',
      t_lang: 'Idioma: español',
    },
  };

  let lang = 'it';
  try { const l = localStorage.getItem('turni.lang'); lang = l === 'es' || l === 'it' ? l : (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'it'; } catch (e) { /* ok */ }
  const L = () => I18N[lang];
  const t = (k, ...a) => { const v = k in L() ? L()[k] : I18N.it[k]; return typeof v === 'function' ? v(...a) : v; };
  const mName = (k) => L().methods[k][0];

  let db = load();

  // ---------- Date, ore, numeri ----------
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = (d) => { const x = addDays(d, -((d.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  const parseNum = (v) => { const n = parseFloat(String(v).trim().replace(/\./g, (m, i, s) => (s.includes(',') ? '' : m)).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const eur = (v) => v.toLocaleString(L().locale, { style: 'currency', currency: 'EUR' });
  const dec = (min) => (min / 60).toLocaleString(L().locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtH = (min) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (!h) return `${m} min`;
    return m ? `${h} h ${pad(m)}` : `${h} h`;
  };
  // "16 h 30" in grande, con le unità più piccole
  const bigH = (min) => `${Math.floor(min / 60)}<em>h</em>${min % 60 ? `${pad(min % 60)}` : ''}`;
  const money = (min) => Math.round((min / 60) * db.settings.extraRate * 100) / 100;

  // Minuti di un turno, contati con il metodo scelto
  function minutes(s, method = db.settings.method) {
    let a = toMin(s.start), b = toMin(s.end);
    if (b <= a) b += 24 * 60; // finisce il giorno dopo
    let m;
    if (method === 'clock30' || method === 'clock15') {
      const q = method === 'clock30' ? 30 : 15;
      m = Math.max(0, Math.floor(b / q) * q - Math.ceil(a / q) * q);
      m -= Number(s.pause) || 0;
    } else {
      m = b - a - (Number(s.pause) || 0);
      if (method === 'dur30') m = Math.floor(m / 30) * 30;
    }
    return Math.max(0, m);
  }

  const sorted = (list) => list.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const between = (from, to) => sorted(db.shifts.filter((s) => s.date >= from && s.date <= to));
  const total = (list, method) => list.reduce((a, s) => a + minutes(s, method), 0);

  // ---------- Conti: settimana, mese, extra ----------
  const W = () => Math.round(db.settings.weekHours * 60);

  function weekInfo(mon, method) {
    const list = between(iso(mon), iso(addDays(mon, 6)));
    const min = total(list, method);
    return { list, min, extra: Math.max(0, min - W()) };
  }

  // Settimane che "appartengono" al mese: quelle il cui giovedì cade nel mese
  function weeksOfMonth(y, m) {
    const out = [];
    for (let w = monday(new Date(y, m, 1)); w <= new Date(y, m + 1, 0); w = addDays(w, 7)) {
      if (addDays(w, 3).getMonth() === m) out.push(w);
    }
    return out;
  }

  // Ore del mese da contratto: ore a settimana × settimane del mese (4 o 5).
  // Non sappiamo come l'azienda decide: proviamo i tre criteri più comuni
  // (quanti lunedì, giovedì o domeniche ha il mese). Se dicono tutti 4 → 4,
  // altrimenti nel dubbio 5 (il conto più basso, per difetto).
  // Mese per mese si può comunque cambiare a mano.
  const countDay = (y, m, wd) => { let n = 0; for (let d = new Date(y, m, 1); d.getMonth() === m; d = addDays(d, 1)) if (d.getDay() === wd) n++; return n; };
  function weeksRule(y, m) {
    const c = [countDay(y, m, 1), countDay(y, m, 4), countDay(y, m, 0)];
    return Math.max(...c) === 4 ? { n: 4, sure: true } : { n: 5, sure: Math.min(...c) === 5 };
  }
  const autoWeeks = (y, m) => weeksRule(y, m).n;
  const isManual = (y, m) => !!db.settings.monthWeeks[`${y}-${pad(m + 1)}`];
  const weeksIn = (y, m) => db.settings.monthWeeks[`${y}-${pad(m + 1)}`] || autoWeeks(y, m);
  const M = (y, m, weeks) => W() * (weeks || weeksIn(y, m));
  const weeksLabel = (y, m) => t(isManual(y, m) ? 'w_manual' : weeksRule(y, m).sure ? 'w_sure' : 'w_doubt');

  function monthInfo(y, m, method = db.settings.method, weeks) {
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const list = between(iso(first), iso(last));
    const min = total(list, method);
    const goal = M(y, m, weeks);
    const extra = Math.max(0, min - goal);
    return { list, min, goal, extra, eur: money(extra), key: `${y}-${pad(m + 1)}` };
  }

  const paid = (key, kind) => db.payments.filter((p) => p.month === key && p.kind === kind).reduce((a, p) => a + p.amount, 0);

  // ---------- Stato della vista ----------
  let tab = 'oggi';
  let cursor = today0();
  try { const t = localStorage.getItem('turni.tab'); if (['oggi', 'settimana', 'mese', 'soldi'].includes(t)) tab = t; } catch (e) { /* ok */ }

  const $ = (id) => document.getElementById(id);
  const view = $('view');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    in: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  // ---------- Pezzi di interfaccia ----------
  function ring(min, goal) {
    const r = 37, c = 2 * Math.PI * r;
    const base = Math.min(min, goal) / (goal || 1);
    const over = goal ? Math.min(1, Math.max(0, min - goal) / goal) : 0;
    return `<div class="ring"><svg viewBox="0 0 84 84">
        <circle class="track" cx="42" cy="42" r="${r}"/>
        <circle class="base" cx="42" cy="42" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - base)}"/>
        ${over ? `<circle class="over" cx="42" cy="42" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - over)}"/>` : ''}
      </svg><div class="pct">${goal ? Math.round((min / goal) * 100) : 0}%</div></div>`;
  }

  function meter(min, goal) {
    const max = Math.max(min, goal) || 1;
    const b = Math.min(min, goal), o = Math.max(0, min - goal);
    return `<div class="meter"><i class="b" style="width:${(b / max) * 100}%"></i><i class="o" style="width:${(o / max) * 100}%"></i></div>
      <div class="meter-legend"><span>${t('contract')} <b>${fmtH(goal)}</b></span>${o ? `<span style="color:var(--money)">Extra <b style="color:inherit">+${fmtH(o)}</b></span>` : `<span>${min < goal ? t('missing', fmtH(goal - min)) : t('full')}</span>`}</div>`;
  }

  function shiftBtn(s) {
    const night = toMin(s.end) <= toMin(s.start);
    const bits = [];
    if (Number(s.pause)) bits.push(t('pause', s.pause));
    if (s.note) bits.push(esc(s.note));
    const m = minutes(s), ex = minutes(s, 'exact');
    if (m !== ex) bits.push(t('exact_h', fmtH(ex)));
    return `<button class="shift" data-edit="${s.id}">
        <span style="min-width:0"><span class="t num">${s.start} – ${s.end}${night ? ' <small>+1</small>' : ''}</span>${bits.length ? `<span class="n">${bits.join(' · ')}</span>` : ''}</span>
        <span class="d num">${fmtH(m)}</span>
      </button>`;
  }

  // Turni di un giorno; tra due turni (turno spezzato) mostra le ore non pagate
  function dayShifts(ds, openHtml = '') {
    let html = '';
    ds.forEach((s, i) => {
      if (i) {
        const g = toMin(s.start) - toMin(ds[i - 1].end);
        if (g > 0) html += `<div class="gap">${t('gap', fmtH(g))}</div>`;
      }
      html += shiftBtn(s);
    });
    return html + openHtml;
  }

  function openShiftBtn() {
    const o = db.open;
    return `<button class="shift open" data-open>
        <span><span class="t num">${o.start} – ${t('running')}</span><span class="n">${t('tap_out')}</span></span>
        <span class="d num" data-live-short>${fmtH(liveMin())}</span>
      </button>`;
  }

  function periodNav(label, sub, isNow) {
    return `<div class="period">
        <button class="icon-btn" data-move="-1" aria-label="${t('prev')}">${ICON.prev}</button>
        <div class="label"><b>${label}</b>${isNow ? `<small>${sub}</small>` : `<button data-today>${t('back_today')}</button>`}</div>
        <button class="icon-btn" data-move="1" aria-label="${t('next')}">${ICON.next}</button>
      </div>`;
  }

  // "Ottobre: 5 settimane = 100 h" — tocca per passare da 4 a 5 settimane
  function weeksBtn(y, m) {
    const n = weeksIn(y, m);
    return `<button class="weeks-btn" data-weeks="${y}-${pad(m + 1)}">${t('weeks_btn', cap(L().months[m]), n, fmtH(M(y, m)), weeksLabel(y, m))}</button>`;
  }

  // Minuti del turno in corso (dall'entrata a adesso)
  function liveMin(now = new Date()) {
    if (!db.open) return 0;
    const start = parse(db.open.date);
    const [h, m] = db.open.start.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    return Math.max(0, Math.floor((now - start) / 60000) - (Number(db.open.pause) || 0));
  }
  function liveClock(now = new Date()) {
    if (!db.open) return '';
    const start = parse(db.open.date);
    const [h, m] = db.open.start.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    const sec = Math.max(0, Math.floor((now - start) / 1000));
    return `${Math.floor(sec / 3600)}:${pad(Math.floor(sec / 60) % 60)}<small>${pad(sec % 60)}</small>`;
  }

  // ---------- Viste ----------
  function renderOggi() {
    const now = new Date();
    const o = db.open;
    let clock;
    if (o) {
      const long = liveMin(now) > 14 * 60;
      clock = `<section class="card clock live">
          <div class="state"><span class="dot"></span>${t('on_shift')}${o.date !== iso(now) ? t('since_day', L().daysLong[parse(o.date).getDay()]) : ''}</div>
          <div class="time" id="liveTime">${liveClock(now)}</div>
          <div class="meta">${t('in_at')} <b class="num">${o.start}</b> · <button data-fix>${t('fix')}</button>${long ? `<br><span style="color:var(--danger)">${t('too_long')}</span>` : ''}</div>
          <button class="punch out" id="punchOut">${ICON.out}${t('punch_out')} <small class="num" id="nowShort">${hhmm(now)}</small></button>
        </section>`;
    } else {
      clock = `<section class="card clock">
          <div class="state"><span class="dot"></span>${t('off_shift')}</div>
          <div class="time num" id="nowTime">${hhmm(now)}</div>
          <div class="meta">${cap(L().dateLong(now))}</div>
          <button class="punch" id="punchIn">${ICON.in}${t('punch_in')} <small class="num" id="nowShort">${hhmm(now)}</small></button>
          <p class="hint">${t('punch_hint')}</p>
        </section>`;
    }

    const wk = weekInfo(monday(now));
    const wMin = wk.min + liveMin(now);
    const mi = monthInfo(now.getFullYear(), now.getMonth());
    const mMin = mi.min + liveMin(now);
    const mGoal = mi.goal;
    const mExtraNow = Math.max(0, mMin - mGoal);

    const recent = sorted(db.shifts).slice(-5).reverse();
    const recentHtml = recent.length
      ? `<div class="section-title">${t('recent')} <button data-goto="settimana">${t('see_all')}</button></div>
         <div class="list">${recent.map((s) => { const d = parse(s.date); return `<div class="day"><div class="dname"><span>${L().days[d.getDay()]}</span><b>${d.getDate()}</b></div><div class="shifts">${shiftBtn(s)}</div></div>`; }).join('')}</div>`
      : `<div class="section-title">${t('recent')}</div><div class="list"><div class="empty">${t('no_shifts')}</div></div>`;

    view.innerHTML = clock
      + `<button class="card tap" data-goto="settimana">
          <div class="kicker">${t('this_week')}</div>
          <div class="ringrow" style="margin-top:10px">${ring(wMin, W())}
            <div class="info"><div class="h num" data-live-week>${fmtH(wMin)}<em>${t('of')} ${fmtH(W())}</em></div>
            <div class="pills">${wMin > W() ? `<span class="pill extra">${t('extra_pill', fmtH(wMin - W()))}</span>` : `<span class="pill">${t('missing_pill', fmtH(W() - wMin))}</span>`}</div></div>
          </div>
        </button>
        <button class="card tap" data-goto="soldi">
          <div class="kicker">${cap(L().months[now.getMonth()])}</div>
          <div class="ringrow" style="margin-top:10px">${ring(mMin, mGoal)}
            <div class="info"><div class="h num">${fmtH(mMin)}<em>${t('of')} ${fmtH(mGoal)}</em></div>
            <div class="pills">${mExtraNow ? `<span class="pill extra">+${fmtH(mExtraNow)} · ${eur(money(mExtraNow))}</span>` : `<span class="pill">${t('missing_pill', fmtH(Math.max(0, mGoal - mMin)))}</span>`}</div></div>
          </div>
        </button>`
      + recentHtml;
  }

  function renderSettimana() {
    const mon = monday(cursor), sun = addDays(mon, 6);
    const wk = weekInfo(mon);
    const isNow = iso(mon) === iso(monday(new Date()));
    const label = `${mon.getDate()}${mon.getMonth() === sun.getMonth() ? '' : ' ' + L().mon[mon.getMonth()]} – ${sun.getDate()} ${L().mon[sun.getMonth()]}`;
    const todayKey = iso(new Date());
    const open = db.open && db.open.date >= iso(mon) && db.open.date <= iso(sun) ? db.open : null;

    // Grafico
    const perDay = [];
    for (let i = 0; i < 7; i++) {
      const key = iso(addDays(mon, i));
      perDay.push(total(wk.list.filter((s) => s.date === key)) + (open && open.date === key ? liveMin() : 0));
    }
    const max = Math.max(8 * 60, ...perDay) * 1.08;
    const bars = perDay.map((m, i) => {
      const d = addDays(mon, i);
      return `<button class="bar${iso(d) === todayKey ? ' today' : ''}" data-scroll="${iso(d)}">
          <span class="v num">${m ? fmtH(m).replace(' h ', ':').replace(' h', 'h') : ''}</span>
          <span class="col${m ? '' : ' zero'}" style="height:${m ? Math.max(6, (m / max) * 100) : 3}%"></span>
          <span class="d">${L().cal[(d.getDay() + 6) % 7]}</span>
        </button>`;
    }).join('');

    const wMin = wk.min + (open ? liveMin() : 0);
    const extra = Math.max(0, wMin - W());
    let rows = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i), key = iso(d);
      const ds = wk.list.filter((s) => s.date === key);
      const hasOpen = open && open.date === key;
      rows += `<div class="day${key === todayKey ? ' is-today' : ''}" id="d-${key}">
          <div class="dname"><span>${L().days[d.getDay()]}</span><b>${d.getDate()}</b></div>
          <div class="shifts">${dayShifts(ds, hasOpen ? openShiftBtn() : '')}
            <button class="add-day${ds.length || hasOpen ? ' small' : ''}" data-add="${key}">${t(ds.length || hasOpen ? 'another' : 'rest')}</button>
          </div>
        </div>`;
    }

    view.innerHTML = periodNav(label, t('this_week'), isNow)
      + `<section class="card">
          <div class="kicker">${t('worked')}</div>
          <div class="big">${bigH(wMin)}</div>
          <div class="sub">${dec(wMin)} ${t('hours')}${extra ? t('over', fmtH(extra), fmtH(W())) : ''}</div>
          ${meter(wMin, W())}
          <div class="bars">${bars}</div>
        </section>
        <div class="list">${rows}</div>`;
  }

  function renderMese() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const now = new Date();
    const isNow = y === now.getFullYear() && m === now.getMonth();
    const mi = monthInfo(y, m);
    const days = new Set(mi.list.map((s) => s.date)).size;

    // Calendario
    const first = new Date(y, m, 1), nDays = new Date(y, m + 1, 0).getDate();
    let cal = L().cal.map((d) => `<div class="h">${d}</div>`).join('');
    for (let i = 0; i < (first.getDay() + 6) % 7; i++) cal += '<div class="blank"></div>';
    for (let d = 1; d <= nDays; d++) {
      const key = iso(new Date(y, m, d));
      const min = total(mi.list.filter((s) => s.date === key));
      const lv = !min ? '' : min < 4 * 60 ? ' l1' : min < 7 * 60 ? ' l2' : ' l3';
      cal += `<button class="${lv}${key === iso(now) ? ' today' : ''}" data-day="${key}"><b>${d}</b><span class="num">${min ? fmtH(min).replace(' h ', ':').replace(' h', 'h') : ''}</span></button>`;
    }

    // Settimane
    const weeks = weeksOfMonth(y, m).map((w) => ({ w, ...weekInfo(w) }));
    const maxW = Math.max(W(), ...weeks.map((x) => x.min)) || 1;
    const wrows = weeks.map((x) => {
      const e = addDays(x.w, 6);
      return `<button class="row" data-week="${iso(x.w)}">
          <span class="l">${x.w.getDate()} ${L().mon[x.w.getMonth()]} – ${e.getDate()} ${L().mon[e.getMonth()]}<small>${x.list.length} ${t('shifts', x.list.length)}</small></span>
          <span class="wbar"><i class="b" style="width:${(Math.min(x.min, W()) / maxW) * 100}%"></i><i class="o" style="width:${(x.extra / maxW) * 100}%"></i></span>
          <span class="r num" style="min-width:64px">${x.min ? fmtH(x.min) : '–'}${x.extra ? `<small style="color:var(--money)">+${fmtH(x.extra)}</small>` : ''}</span>
        </button>`;
    }).join('');

    view.innerHTML = periodNav(`${cap(L().months[m])} ${y}`, t('this_month'), isNow)
      + `<section class="card">
          <div class="kicker">${t('worked')}</div>
          <div class="big">${bigH(mi.min)}</div>
          <div class="sub">${dec(mi.min)} ${t('hours')}</div>
          ${meter(mi.min, mi.goal)}
          ${weeksBtn(y, m)}
          <div class="stats">
            <div class="stat"><b class="num">${mi.list.length}</b><span>${t('shifts', mi.list.length)}</span></div>
            <div class="stat"><b class="num">${days}</b><span>${t('days_n', days)}</span></div>
            <div class="stat money"><b class="num">${eur(mi.eur)}</b><span>extra</span></div>
          </div>
          <div class="cal">${cal}</div>
        </section>
        <div class="section-title">${t('week_by_week')}</div>
        <div class="list">${wrows}</div>
        ${mi.list.length ? `<div class="actions"><button class="btn" data-csv-month>${t('csv_month')}</button></div>` : ''}`;
  }

  function renderSoldi() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const now = new Date();
    const isNow = y === now.getFullYear() && m === now.getMonth();
    const s = db.settings;
    const mi = monthInfo(y, m);
    const got = paid(mi.key, 'extra');
    const diff = Math.round((mi.eur - got) * 100) / 100;

    let state;
    if (!got && !mi.eur) state = `<div class="paystate"><div class="ic">${ICON.clock}</div><div><b>${t('none_extra', isNow)}</b><span>${t('none_extra_sub', fmtH(mi.goal))}</span></div></div>`;
    else if (!got) state = `<div class="paystate due"><div class="ic">${ICON.clock}</div><div><b>${t('to_get', eur(mi.eur))}</b><span>${t('to_get_sub')}</span></div></div>`;
    else if (Math.abs(diff) < 0.01) state = `<div class="paystate ok"><div class="ic">${ICON.check}</div><div><b>${t('all_paid')}</b><span>${t('all_paid_sub', eur(got))}</span></div></div>`;
    else if (diff > 0) state = `<div class="paystate due"><div class="ic">${ICON.clock}</div><div><b>${t('missing_eur', eur(diff))}</b><span>${t('got_of', eur(got), eur(mi.eur))}</span></div></div>`;
    else state = `<div class="paystate ok"><div class="ic">${ICON.check}</div><div><b>${t('got_more', eur(-diff))}</b><span>${t('got_more_sub', eur(got), eur(mi.eur))}</span></div></div>`;

    // Il calcolo passo per passo
    const wn = weeksIn(y, m);
    const calc = `<div class="row"><span class="l">${t('worked')}</span><span class="r num">${fmtH(mi.min)}<small>${dec(mi.min)} ${t('hours')}</small></span></div>
        <button class="row" data-weeks="${mi.key}"><span class="l">${t('contract_hours')}<small>${t('weeks_x', wn, fmtH(W()), weeksLabel(y, m))} · <span style="color:var(--accent-ink);font-weight:650">${t('change')}</span></small></span><span class="r num">− ${fmtH(mi.goal)}</span></button>
        <div class="row"><span class="l">${t('extra_hours')}</span><span class="r num">${fmtH(mi.extra)}<small>${dec(mi.extra)} ${t('hours')}</small></span></div>
        <div class="row total"><span class="l">${t('per_hour', eur(s.extraRate))}</span><span class="r num money">${eur(mi.eur)}</span></div>`;

    // Quale combinazione (conteggio ore × 4 o 5 settimane) torna con i soldi ricevuti?
    let match = null, matchW = null;
    if (got) {
      let best = Infinity;
      Object.keys(METHODS).forEach((k) => [wn, wn === 5 ? 4 : 5].forEach((n) => {
        const d = Math.abs(monthInfo(y, m, k, n).eur - got);
        if (d < best) { best = d; match = d < 0.5 ? k : null; matchW = d < 0.5 ? n : null; }
      }));
    }

    // Il resoconto con 4 e con 5 settimane
    const weeksRows = [4, 5].map((n) => {
      const x = monthInfo(y, m, s.method, n);
      return `<button class="row${n === wn ? ' sel' : ''}" data-setweeks="${mi.key}|${n}">
          <span class="l">${t('if_weeks', n)}${n === wn ? ` <span class="pill extra" style="margin-left:4px">${t('in_use')}</span>` : ''}${n === matchW ? ` <span class="pill accent" style="margin-left:4px">${t('matches')}</span>` : ''}<small>${t('from_contract', fmtH(x.goal), fmtH(x.extra))}</small></span>
          <span class="r num money">${eur(x.eur)}</span>
        </button>`;
    }).join('');
    const methods = Object.keys(METHODS).map((k) => {
      const x = monthInfo(y, m, k);
      return `<button class="row${k === s.method ? ' sel' : ''}" data-method="${k}">
          <span class="l">${mName(k)}${k === s.method ? ` <span class="pill extra" style="margin-left:4px">${t('in_use')}</span>` : ''}${k === match && matchW === wn ? ` <span class="pill accent" style="margin-left:4px">${t('matches')}</span>` : ''}<small>${t('worked_extra', fmtH(x.min), fmtH(x.extra))}</small></span>
          <span class="r num money">${eur(x.eur)}</span>
        </button>`;
    }).join('');

    // Stipendio
    let salary = '';
    if (s.salary) {
      const sg = paid(mi.key, 'stipendio');
      salary = `<div class="section-title">${t('salary_title')}</div><div class="list">
          <div class="row"><span class="l">${t('salary_contract')}</span><span class="r num">${eur(s.salary)}</span></div>
          <div class="row"><span class="l">${t('received')}</span><span class="r num${sg >= s.salary ? ' money' : ''}">${sg ? eur(sg) : '–'}</span></div>
          <div class="row total"><span class="l">${t('month_total')}</span><span class="r num money">${eur(s.salary + mi.eur)}</span></div>
        </div>`;
    }

    const pays = db.payments.filter((p) => p.month === mi.key).sort((a, b) => a.date.localeCompare(b.date));
    const paysHtml = pays.length
      ? `<div class="list">${pays.map((p) => { const d = parse(p.date); return `<div class="row"><span class="l">${t(p.kind === 'extra' ? 'k_extra' : 'k_salary')}<small>${t('got_on', `${d.getDate()} ${L().mon[d.getMonth()]}`)}${p.note ? ' · ' + esc(p.note) : ''}</small></span><span class="r num money">${eur(p.amount)}</span><button class="x" data-delpay="${p.id}" aria-label="${t('del')}">${ICON.x}</button></div>`; }).join('')}</div>`
      : `<div class="list"><div class="empty">${t('no_pays')}</div></div>`;

    // Totale ancora da ricevere, tutti i mesi
    const months = new Set(db.shifts.map((x) => x.date.slice(0, 7)));
    let owed = 0;
    months.forEach((k) => { const [yy, mm] = k.split('-').map(Number); owed += Math.max(0, monthInfo(yy, mm - 1).eur - paid(k, 'extra')); });

    view.innerHTML = periodNav(`${cap(L().months[m])} ${y}`, t('this_month'), isNow)
      + `<section class="card">
          <div class="kicker">${t('extra_of', L().months[m])}</div>
          <div class="big money">${eur(mi.eur)}</div>
          <div class="sub">${t('hero_sub', fmtH(mi.extra), eur(s.extraRate), wn, isNow)}</div>
          ${state}
          <div class="actions"><button class="btn money full" id="addPay">${ICON.plus}${t('add_pay')}</button></div>
        </section>
        ${owed >= 0.01 ? `<div class="card flat" style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span><span class="kicker">${t('owed')}</span><br><span class="sub">${t('all_months')}${months.has(monthKey(now)) ? t('incl_now') : ''}</span></span><b class="num" style="font-size:22px;color:var(--accent-ink)">${eur(owed)}</b></div>` : ''}
        <div class="section-title">${t('four_five')}</div>
        <div class="list">${weeksRows}</div>
        <p class="hint">${isManual(y, m) ? t('w_hint_manual') : weeksRule(y, m).sure ? t('w_hint_sure', cap(L().months[m])) : t('w_hint_doubt')} ${t('w_hint_tap')}</p>
        <div class="section-title">${t('calc')}</div>
        <div class="list">${calc}</div>
        <div class="section-title">${t('other_ways')}</div>
        <div class="list">${methods}</div>
        <p class="hint">${t('methods_hint')}</p>
        ${salary}
        <div class="section-title">${t('got_for', L().months[m])}</div>
        ${paysHtml}`;
  }

  function render(animate) {
    document.querySelectorAll('.tabbar .tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    $('title').textContent = t('tab_' + tab);
    const now = new Date();
    $('eyebrow').textContent = tab === 'oggi' ? cap(L().dateLong(now)) : t(tab === 'soldi' ? 'eyebrow_money' : 'worked');
    ({ oggi: renderOggi, settimana: renderSettimana, mese: renderMese, soldi: renderSoldi })[tab]();
    if (animate) { view.classList.remove('view-enter'); void view.offsetWidth; view.classList.add('view-enter'); }
  }

  // Aggiorna l'orologio ogni secondo (solo i numeri, senza ridisegnare tutto)
  let lastMinute = new Date().getMinutes();
  setInterval(() => {
    const now = new Date();
    // Ogni minuto, con un turno in corso, aggiorna anche i totali
    if (now.getMinutes() !== lastMinute) { lastMinute = now.getMinutes(); if (db.open && !document.hidden) render(); }
    const n = $('nowTime'); if (n) n.textContent = hhmm(now);
    const ns = $('nowShort'); if (ns) ns.textContent = hhmm(now);
    const l = $('liveTime'); if (l) l.innerHTML = liveClock(now);
    document.querySelectorAll('[data-live-short]').forEach((el) => { el.textContent = fmtH(liveMin(now)); });
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  // ---------- Navigazione ----------
  function go(t) {
    if (t === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    tab = t;
    try { localStorage.setItem('turni.tab', t); } catch (e) { /* ok */ }
    window.scrollTo(0, 0);
    render(true);
  }
  document.querySelectorAll('.tabbar .tab').forEach((b) => { b.onclick = () => go(b.dataset.tab); });

  function move(dir) {
    if (tab === 'settimana') cursor = addDays(cursor, 7 * dir);
    else if (tab === 'mese' || tab === 'soldi') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    else return;
    render(true);
  }

  // Scorri a destra/sinistra per cambiare settimana o mese
  let tx = null, ty = null;
  view.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  view.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
    tx = null;
  }, { passive: true });

  const buzz = () => { try { navigator.vibrate && navigator.vibrate(15); } catch (e) { /* ok */ } };

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const d = btn.dataset;
    if (btn.id === 'punchIn') punchIn();
    else if ('fix' in d) openShift('fix');
    else if (btn.id === 'punchOut' || 'open' in d) openShift('open');
    else if (btn.id === 'addPay') openPay();
    else if (d.edit) openShift('edit', db.shifts.find((s) => s.id === d.edit));
    else if (d.add) openShift('new', null, d.add);
    else if (d.move) move(Number(d.move));
    else if ('today' in d) { cursor = today0(); render(true); }
    else if (d.goto) go(d.goto);
    else if (d.week) { cursor = parse(d.week); go('settimana'); }
    else if (d.scroll) { const el = $('d-' + d.scroll); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } }
    else if (d.day) {
      const has = db.shifts.some((s) => s.date === d.day);
      if (has) { cursor = parse(d.day); go('settimana'); setTimeout(() => { const el = $('d-' + d.day); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); } }, 50); }
      else openShift('new', null, d.day);
    }
    else if (d.setweeks) {
      const [key, n] = d.setweeks.split('|');
      const [yy, mm] = key.split('-').map(Number);
      if (Number(n) === autoWeeks(yy, mm - 1)) delete db.settings.monthWeeks[key]; else db.settings.monthWeeks[key] = Number(n);
      save(); render();
      toast(t('t_weeks', cap(L().months[mm - 1]), n, fmtH(M(yy, mm - 1))));
    }
    else if (d.weeks) {
      const [yy, mm] = d.weeks.split('-').map(Number);
      const auto = autoWeeks(yy, mm - 1), next = weeksIn(yy, mm - 1) === 5 ? 4 : 5;
      if (next === auto) delete db.settings.monthWeeks[d.weeks]; else db.settings.monthWeeks[d.weeks] = next;
      save(); render();
      toast(t('t_weeks', cap(L().months[mm - 1]), next, fmtH(M(yy, mm - 1))));
    }
    else if (d.method) { db.settings.method = d.method; save(); render(); toast(t('t_method', mName(d.method))); }
    else if (d.delpay) {
      const p = db.payments.find((x) => x.id === d.delpay);
      db.payments = db.payments.filter((x) => x !== p); save(); render();
      toast(t('t_pay_del'), t('undo'), () => { db.payments.push(p); save(); render(); });
    } else if ('csvMonth' in d) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      exportCsv(between(iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))), `turni-${y}-${pad(m + 1)}.csv`);
    }
  });

  // ---------- Timbratura ----------
  function punchIn() {
    const now = new Date();
    db.open = { date: iso(now), start: hhmm(now), pause: 0, note: '' };
    save(); buzz(); render();
    toast(t('t_in', db.open.start), t('fix_btn'), () => openShift('fix'));
  }

  // ---------- Fogli dal basso ----------
  let sheet = null;
  function show(el) { sheet = el; el.scrollTop = 0; $('scrim').classList.add('open'); el.classList.add('open'); document.body.classList.add('locked'); }
  function hide() {
    if (!sheet) return;
    if (sheet.id === 'settingsSheet') saveSettings();
    sheet.style.transform = ''; sheet.style.transition = ''; $('scrim').style.opacity = '';
    sheet.classList.remove('open'); $('scrim').classList.remove('open'); sheet = null;
    document.body.classList.remove('locked');
  }
  $('scrim').onclick = hide;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  // Trascina il foglio verso il basso per chiuderlo (quando è già in cima)
  document.querySelectorAll('.sheet').forEach((el) => {
    let y0 = null, t0 = 0, dy = 0, dragging = false;
    el.addEventListener('touchstart', (e) => {
      y0 = el.scrollTop <= 0 ? e.touches[0].clientY : null;
      t0 = Date.now(); dy = 0; dragging = false;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if (!dragging && dy > 8 && el.scrollTop <= 0) dragging = true;
      if (!dragging) { if (dy < 0) y0 = null; return; }
      e.preventDefault();
      const d = Math.max(0, dy - 8);
      el.style.transition = 'none';
      el.style.transform = `translateY(${d}px)`;
      $('scrim').style.opacity = String(Math.max(0, 1 - d / el.offsetHeight));
    }, { passive: false });
    el.addEventListener('touchend', () => {
      if (!dragging) { y0 = null; return; }
      const fast = dy / Math.max(1, Date.now() - t0) > 0.5;
      el.style.transition = ''; $('scrim').style.opacity = '';
      if (dy > 110 || (fast && dy > 40)) hide();
      else el.style.transform = '';
      y0 = null; dragging = false;
    });
  });

  // ---------- Turno: nuovo, modifica, in corso ----------
  // mode: 'new' (nuovo), 'edit' (turno salvato), 'open' (chiudi il turno in corso), 'fix' (correggi l'entrata)
  let editMode = 'new', editing = null;
  const onOpen = () => editMode === 'open' || editMode === 'fix';
  const f = { date: $('fDate'), start: $('fStart'), end: $('fEnd'), start2: $('fStart2'), end2: $('fEnd2'), note: $('fNote') };
  let split = false;
  function setSplit(on) {
    split = on;
    $('fSplit').setAttribute('aria-pressed', on);
    $('splitBox').hidden = !on;
    updatePreview();
  }
  $('fSplit').onclick = () => setSplit(!split);

  function presets() {
    const count = {};
    db.shifts.forEach((s) => { const k = `${s.start}|${s.end}`; count[k] = (count[k] || 0) + 1; });
    return Object.entries(count).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k.split('|'));
  }

  function openShift(mode, s, date) {
    editMode = mode; editing = s || null;
    const now = new Date();
    $('fDelete').hidden = mode === 'new';
    $('fDelete').textContent = t(mode === 'open' || mode === 'fix' ? 'cancel_in' : 'delete');
    let ps = [];
    if (mode === 'open' || mode === 'fix') {
      const o = db.open;
      $('shiftTitle').textContent = t(mode === 'open' ? 'end_shift' : 'fix_in');
      f.date.value = o.date; f.start.value = o.start; f.end.value = mode === 'open' ? hhmm(now) : '';
      f.note.value = o.note || '';
    } else if (mode === 'edit') {
      $('shiftTitle').textContent = t('edit_shift');
      f.date.value = s.date; f.start.value = s.start; f.end.value = s.end;
      f.note.value = s.note || '';
    } else {
      $('shiftTitle').textContent = t('new_shift');
      f.date.value = date || iso(now);
      f.start.value = ''; f.end.value = ''; f.note.value = '';
      ps = presets();
    }
    f.start2.value = ''; f.end2.value = '';
    $('fSplit').hidden = mode !== 'new';
    split = false; $('fSplit').setAttribute('aria-pressed', 'false'); $('splitBox').hidden = true;
    $('presetsBox').innerHTML = ps.length
      ? `<div class="chips-label">${t('presets')}</div><div class="chips">${ps.map(([a, b]) =>
        `<button type="button" class="chip num" data-preset="${a}|${b}">${a}–${b}</button>`).join('')}</div>`
      : '';
    updatePreview();
    show($('shiftSheet'));
  }

  function updatePreview() {
    const p = $('fPreview');
    if (!f.start.value) { p.className = 'preview bad'; p.textContent = t('pv_in'); return; }
    if (!f.end.value) {
      p.className = 'preview';
      p.innerHTML = t(db.open && !onOpen() ? 'pv_also_out' : 'pv_running');
      if (db.open && !onOpen()) p.className = 'preview bad';
      return;
    }
    const parts = [{ start: f.start.value, end: f.end.value }];
    let note = '';
    if (split) {
      if (!f.start2.value || !f.end2.value) { p.className = 'preview bad'; p.textContent = t('pv_back'); return; }
      const gap = toMin(f.start2.value) - toMin(f.end.value);
      if (gap <= 0 || toMin(f.end.value) <= toMin(f.start.value)) { p.className = 'preview bad'; p.textContent = t('pv_order'); return; }
      parts.push({ start: f.start2.value, end: f.end2.value });
      note = t('pv_split', fmtH(minutes(parts[0], 'exact')), fmtH(minutes(parts[1], 'exact')), fmtH(gap));
    }
    const ex = total(parts, 'exact'), m = total(parts);
    const last = parts[parts.length - 1];
    if (toMin(last.end) <= toMin(last.start)) note += t('pv_next_day');
    p.className = 'preview';
    p.innerHTML = t('pv_total', fmtH(ex), dec(ex))
      + `<small>${note}${m !== ex ? t('pv_method', mName(db.settings.method), fmtH(m)) : ''}</small>`;
  }

  $('presetsBox').addEventListener('click', (e) => {
    const c = e.target.closest('[data-preset]');
    if (!c) return;
    const [a, b] = c.dataset.preset.split('|');
    f.start.value = a; f.end.value = b;
    updatePreview();
  });
  ['input', 'change'].forEach((ev) => [f.start, f.end, f.start2, f.end2].forEach((el) => el.addEventListener(ev, updatePreview)));

  $('shiftSheet').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = { date: f.date.value, start: f.start.value, end: f.end.value, pause: 0, note: f.note.value.trim() };
    if (!data.date || !data.start) return;

    // Turno spezzato: due turni nello stesso giorno, le ore in mezzo non contano
    if (split) {
      if (!data.end || !f.start2.value || !f.end2.value) { toast(t('t_four')); return; }
      if (toMin(f.start2.value) <= toMin(data.end) || toMin(data.end) <= toMin(data.start)) { toast(t('pv_order')); return; }
      const second = { ...data, start: f.start2.value, end: f.end2.value };
      db.shifts.push({ id: uid(), ...data }, { id: uid(), ...second });
      save(); buzz(); hide();
      if (tab !== 'oggi') cursor = parse(data.date);
      render();
      toast(t('t_split_saved', fmtH(minutes(data, 'exact') + minutes(second, 'exact'))));
      return;
    }

    // Senza uscita: è (o resta) un turno in corso
    if (!data.end) {
      if (editMode === 'edit' || (db.open && !onOpen())) { toast(t('t_need_out')); return; }
      db.open = { date: data.date, start: data.start, pause: 0, note: data.note };
      save(); hide(); render();
      toast(t('t_running', data.start));
      return;
    }
    if (!minutes(data, 'exact')) { toast(t('t_same')); return; }

    if (editMode === 'edit') Object.assign(editing, data);
    else {
      db.shifts.push({ id: uid(), ...data });
      if (onOpen()) db.open = null;
    }
    save(); buzz();
    const mode = editMode;
    hide();
    if (tab !== 'oggi') cursor = parse(data.date);
    render();
    toast(mode === 'edit' ? t('t_updated') : t('t_saved', fmtH(minutes(data, 'exact'))));
  });
  $('fCancel').onclick = hide;
  $('fDelete').onclick = () => {
    if (onOpen()) {
      const o = db.open; db.open = null; save(); hide(); render();
      toast(t('t_in_cancel'), t('restore'), () => { db.open = o; save(); render(); });
      return;
    }
    const s = editing;
    db.shifts = db.shifts.filter((x) => x !== s);
    save(); hide(); render();
    toast(t('t_deleted'), t('undo'), () => { db.shifts.push(s); save(); render(); });
  };
  $('addShift').onclick = () => {
    const d = tab === 'settimana' && iso(monday(cursor)) !== iso(monday(new Date())) ? iso(monday(cursor)) : null;
    openShift('new', null, d);
  };

  // ---------- Soldi ricevuti ----------
  let payKind = 'extra';
  $('payKind').addEventListener('click', (e) => {
    const c = e.target.closest('[data-kind]');
    if (!c) return;
    payKind = c.dataset.kind;
    document.querySelectorAll('#payKind .chip').forEach((b) => b.setAttribute('aria-pressed', b === c));
  });
  function openPay() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const opts = [];
    for (let i = -12; i <= 1; i++) { const d = new Date(y, m + i, 1); opts.push(`<option value="${monthKey(d)}">${cap(L().months[d.getMonth()])} ${d.getFullYear()}</option>`); }
    $('pMonth').innerHTML = opts.join('');
    $('pMonth').value = monthKey(new Date(y, m, 1));
    payKind = 'extra';
    document.querySelectorAll('#payKind .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.kind === 'extra'));
    const mi = monthInfo(y, m);
    const due = Math.max(0, mi.eur - paid(mi.key, 'extra'));
    $('pAmount').value = due ? due.toFixed(2).replace('.', ',') : '';
    $('pDate').value = iso(new Date());
    $('pNote').value = '';
    show($('paySheet'));
  }
  $('paySheet').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Math.round(parseNum($('pAmount').value) * 100) / 100;
    if (!(amount > 0)) { toast(t('t_amount')); return; }
    db.payments.push({ id: uid(), kind: payKind, amount, date: $('pDate').value, month: $('pMonth').value, note: $('pNote').value.trim() });
    save(); buzz(); hide();
    const [yy, mm] = $('pMonth').value.split('-').map(Number);
    cursor = new Date(yy, mm - 1, 1);
    render();
    toast(t('t_paid', eur(amount)));
  });
  $('pCancel').onclick = hide;

  // ---------- Impostazioni ----------
  const fmtIn = (n) => (n ? String(n).replace('.', ',') : '');
  function buildMethods() {
    const cur = document.querySelector('input[name="method"]:checked');
    const sel = cur ? cur.value : db.settings.method;
    $('sMethod').innerHTML = Object.keys(METHODS).map((k) =>
      `<label><input type="radio" name="method" value="${k}"${k === sel ? ' checked' : ''}><span><b>${mName(k)}</b><small>${L().methods[k][1]}</small></span></label>`).join('');
  }
  buildMethods();
  $('openSettings').onclick = () => {
    const s = db.settings;
    $('sWeek').value = fmtIn(s.weekHours);
    $('sRate').value = s.extraRate ? s.extraRate.toFixed(2).replace('.', ',') : '';
    $('sSalary').value = s.salary ? s.salary.toFixed(2).replace('.', ',') : '';
    document.querySelectorAll('input[name="method"]').forEach((r) => { r.checked = r.value === s.method; });
    show($('settingsSheet'));
  };
  function saveSettings() {
    const s = db.settings;
    s.weekHours = parseNum($('sWeek').value) || DEFAULTS.weekHours;
    s.extraRate = parseNum($('sRate').value);
    s.salary = parseNum($('sSalary').value);
    const m = document.querySelector('input[name="method"]:checked'); if (m) s.method = m.value;
    save(); render();
  }
  $('settingsDone').onclick = hide;

  // ---------- Backup ed Excel ----------
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv(list, name) {
    // Separatore ";" e virgola decimale: Excel in italiano lo apre già in colonne
    const method = db.settings.method;
    const head = L().csv.slice();
    if (method !== 'exact') head.push(t('csv_h', mName(method)));
    head.push(t('csv_note'));
    const rows = [head];
    sorted(list).forEach((s) => {
      const d = parse(s.date);
      const r = [`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, L().days[d.getDay()], s.start, s.end, dec(minutes(s, 'exact'))];
      if (method !== 'exact') r.push(dec(minutes(s)));
      r.push(`"${(s.note || '').replace(/"/g, '""')}"`);
      rows.push(r);
    });
    const tot = [t('csv_total'), '', '', '', dec(total(list, 'exact'))];
    if (method !== 'exact') tot.push(dec(total(list)));
    rows.push(tot);
    download(name, '﻿' + rows.map((r) => r.join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  $('exportCsv').onclick = () => {
    if (!db.shifts.length) { toast(t('t_empty')); return; }
    exportCsv(db.shifts, 'turni-tutti.csv');
  };
  $('exportJson').onclick = () => {
    download(`turni-backup-${iso(new Date())}.json`, JSON.stringify({ app: 'turni', version: 2, ...db }, null, 2), 'application/json');
    toast(t('t_backup'));
  };
  $('importJson').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.shifts)) throw new Error('formato');
      const okT = (t) => /^\d{2}:\d{2}$/.test(t);
      const shifts = d.shifts.filter((s) => s && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && okT(s.start) && okT(s.end))
        .map((s) => ({ id: String(s.id || uid()), date: s.date, start: s.start, end: s.end, pause: Number(s.pause) || 0, note: String(s.note || '') }));
      const payments = (Array.isArray(d.payments) ? d.payments : []).filter((p) => p && Number(p.amount) > 0 && /^\d{4}-\d{2}$/.test(p.month))
        .map((p) => ({ id: String(p.id || uid()), kind: p.kind === 'stipendio' ? 'stipendio' : 'extra', amount: Number(p.amount), date: String(p.date || ''), month: p.month, note: String(p.note || '') }));
      if (!db.shifts.length && !db.payments.length) {
        db = normalize({ shifts, payments, open: d.open, settings: d.settings });
        save(); hide(); render(); toast(t('t_loaded', shifts.length));
        return;
      }
      // Ci sono già dei dati: aggiungo solo quello che manca, senza cancellare niente
      const have = new Set(db.shifts.map((s) => `${s.date}|${s.start}|${s.end}`));
      const newShifts = shifts.filter((s) => !have.has(`${s.date}|${s.start}|${s.end}`));
      const payIds = new Set(db.payments.map((p) => p.id));
      const newPays = payments.filter((p) => !payIds.has(p.id));
      if (!newShifts.length && !newPays.length) { toast(t('t_have_all')); return; }
      if (!confirm(t('c_merge', newShifts.length, newPays.length))) return;
      db.shifts.push(...newShifts); db.payments.push(...newPays);
      save(); hide(); render(); toast(t('t_added', newShifts.length));
    } catch (err) { toast(t('t_bad_file')); }
  };

  // ---------- Avvisi ----------
  let toastT, toastFn = null;
  function toast(msg, action, fn) {
    $('toastMsg').textContent = msg;
    $('toastAct').textContent = action || '';
    toastFn = fn || null;
    $('toast').classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('show'), action ? 5000 : 2400);
  }
  $('toastAct').onclick = () => { $('toast').classList.remove('show'); if (toastFn) toastFn(); toastFn = null; };

  // ---------- Lingua ----------
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('#langPick .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === lang));
    buildMethods();
  }
  $('langPick').addEventListener('click', (e) => {
    const c = e.target.closest('[data-lang]');
    if (!c || c.dataset.lang === lang) return;
    lang = c.dataset.lang;
    try { localStorage.setItem('turni.lang', lang); } catch (err) { /* ok */ }
    applyLang(); render();
    toast(t('t_lang'));
  });

  applyLang();
  render(true);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
