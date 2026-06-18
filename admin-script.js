 let currentUser = null;
  let currentEdit = null;
  let currentFormEventId = null;
  let currentFormFieldId = null;

  // ===== AUTH =====
  window.addEventListener('DOMContentLoaded', restoreSession);

  async function restoreSession() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.textContent = '';

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data?.session?.user) {
        initUserSession(data.session.user);
        return;
      }
    } catch (error) {
      console.error('Session restore failed:', error?.message || error);
    }

    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('adminView').style.display = 'none';
  }

  function getUserRole(user) {
    if (!user) return 'admin';
    const role = user.user_metadata?.role;
    if (role === 'teacher') return 'teacher';
    if (role === 'admin') return 'admin';
    if (user.email?.toLowerCase().includes('teacher')) return 'teacher';
    return 'admin';
  }

  function initUserSession(user) {
    currentUser = {
      email: user.email,
      role: getUserRole(user)
    };

    document.getElementById('loginView').style.display = 'none';
    document.getElementById('adminView').style.display = 'flex';
    setupUI();
    loadAllData();
  }

  async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
      errorDiv.textContent = 'Please fill in all fields.';
      return;
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data?.user) throw new Error('Unable to sign in.');

      initUserSession(data.user);
    } catch (error) {
      errorDiv.textContent = 'Login error: ' + (error?.message || 'Invalid credentials');
      document.getElementById('password').value = '';
    }
  }

  async function handleLogout() {
    await client.auth.signOut();
    currentUser = null;
    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('adminView').style.display = 'none';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  }

  function setupUI() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    const sections = document.querySelectorAll('.content-section');

    // Update logo based on role
    document.querySelector('.sidebar-logo').textContent = currentUser.role === 'teacher' ? 'STUCO TEACHER' : 'STUCO ADMIN';

    if (currentUser.role === 'teacher') {
      // Remove non-teacher sections from sidebar
      const toRemove = ['announcements', 'initiatives', 'contact', 'survey'];
      toRemove.forEach(section => {
        const li = sidebarNav.querySelector(`[data-section="${section}"]`);
        if (li) li.parentElement.remove();
      });

      // Hide non-teacher sections and set initial active
      sections.forEach(sec => {
        if (!['events', 'registrationForms', 'registrations'].includes(sec.id)) {
          sec.style.display = 'none';
        }
        sec.classList.remove('active');
      });
      document.getElementById('events').classList.add('active');
      document.querySelector('[data-section="events"]').classList.add('active');
    } else {
      // For admin, show only the default active section
      sections.forEach(sec => {
        sec.classList.remove('active');
      });
      document.getElementById('announcements').classList.add('active');
      document.querySelector('[data-section="announcements"]').classList.add('active');
    }
  }

  // ===== NAVIGATION =====
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const section = this.dataset.section;
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById(section).classList.add('active');
      
      loadSectionData(section);
    });
  });

  // ===== LOAD DATA =====
  async function loadAllData() {
    const initialSection = currentUser.role === 'teacher' ? 'events' : 'announcements';
    loadSectionData(initialSection);
  }

  async function loadSectionData(section) {
    if (currentUser.role === 'teacher' && !['events', 'registrationForms'].includes(section)) {
      return;
    }
    switch(section) {
      case 'announcements':
        await loadAnnouncements();
        break;
      case 'events':
        await loadEvents();
        break;
      case 'initiatives':
        await loadInitiatives();
        break;
      case 'registrations':
        await loadRegistrations();
        break;
      case 'registrationForms':
        await loadFormBuilderEvents();
        await loadFormFields();
        break;
      case 'contact':
        await loadContact();
        break;
      case 'survey':
        await loadSurvey();
        break;
    }
  }

  // ===== ANNOUNCEMENTS =====
  async function loadAnnouncements() {
    try {
      const { data, error } = await client
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let html = '';
      if (data && data.length > 0) {
        data.forEach(ann => {
          html += `
            <div class="card">
              <div class="card-content">
                <h3>${ann.title}</h3>
                <p>${ann.content.substring(0, 100)}...</p>
                <small>${ann.date}</small>
                ${ann.redirect_url ? `<div style="font-size: 11px; color: var(--gold); margin-top: 5px;">Redirect: ${ann.redirect_url}</div>` : ''}
              </div>
              <div class="card-actions">
                <button class="btn-sm btn-edit" onclick="editAnnouncement(${ann.id})">Edit</button>
                <button class="btn-sm btn-delete" onclick="deleteAnnouncement(${ann.id})">Delete</button>
              </div>
            </div>
          `;
        });
      } else {
        html = '<div class="empty-state"><p>No announcements yet</p></div>';
      }
      document.getElementById('announcementsList').innerHTML = html;
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }

  function openAddAnnouncement() {
    currentEdit = null;
    document.getElementById('modalTitle').textContent = 'New Announcement';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="annTitle" placeholder="Announcement title">
      </div>
      <div class="form-group">
        <label>Content</label>
        <textarea id="annContent" placeholder="Announcement content"></textarea>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input type="text" id="annDate" placeholder="e.g., September 5, 2026">
      </div>
      <div class="form-group">
        <label>Redirect URL (Optional)</label>
        <input type="text" id="annRedirectUrl" placeholder="https://example.com/news-link">
      </div>
      <button class="btn-save" onclick="saveAnnouncement()">Save Announcement</button>
    `;
    document.getElementById('modal').classList.add('active');
  }

  async function editAnnouncement(id) {
    try {
      const { data } = await client.from('announcements').select('*').eq('id', id).single();
      currentEdit = id;
      document.getElementById('modalTitle').textContent = 'Edit Announcement';
      document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="annTitle" value="${data.title}">
        </div>
        <div class="form-group">
          <label>Content</label>
          <textarea id="annContent">${data.content}</textarea>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="text" id="annDate" value="${data.date}">
        </div>
        <div class="form-group">
          <label>Redirect URL (Optional)</label>
          <input type="text" id="annRedirectUrl" value="${data.redirect_url || ''}">
        </div>
        <button class="btn-save" onclick="saveAnnouncement()">Update Announcement</button>
      `;
      document.getElementById('modal').classList.add('active');
    } catch (error) {
      alert('Error loading announcement: ' + error.message);
    }
  }

  async function saveAnnouncement() {
    const title = document.getElementById('annTitle').value;
    const content = document.getElementById('annContent').value;
    const date = document.getElementById('annDate').value;
    const redirect_url = document.getElementById('annRedirectUrl').value;

    if (!title || !content || !date) {
      alert('Please fill all fields');
      return;
    }

    try {
      if (currentEdit) {
        await client.from('announcements').update({ title, content, date, redirect_url }).eq('id', currentEdit);
      } else {
        await client.from('announcements').insert([{ title, content, date, redirect_url }]);
      }
      closeModal();
      loadAnnouncements();
    } catch (error) {
      alert('Error saving: ' + error.message);
    }
  }

  async function deleteAnnouncement(id) {
    if (confirm('Delete this announcement?')) {
      try {
        await client.from('announcements').delete().eq('id', id);
        loadAnnouncements();
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  }

  // ===== EVENTS =====
async function loadEvents() {
  try {
    const { data, error } = await client
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let html = '';
    if (data && data.length > 0) {
      data.forEach(evt => {
        const registrationLink = `register.html?event_id=${evt.id}`;
        const statusBadge = evt.registration_closed 
          ? '<span class="field-badge" style="background:#fce8e6; color:#9f2a26;">Closed</span>' 
          : '<span class="field-badge" style="background:#eaf7eb; color:#21703a;">Open</span>';
        
        // Handle fallback text safely if location or times are empty strings
        const locText = evt.location ? evt.location : 'No location specified';
        const timeText = (evt.start_time || evt.end_time) 
          ? `${evt.start_time || ''} – ${evt.end_time || ''}`.replace(/^ – | – $/g, '')
          : 'Time TBA';

        html += `
          <div class="card">
            <div class="card-content">
              <h3>${evt.title}</h3>
              <div style="margin-bottom: 8px;">${statusBadge}</div>
              <p>${evt.description.substring(0, 80)}...</p>
              <small>${evt.event_date} @ ${locText} (${timeText})</small>
              <div style="margin-top:10px; font-size:12px; color:rgba(0,0,0,0.6);">
                Registration link: <a href="${registrationLink}" target="_blank">Open form</a>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-sm btn-edit" onclick="editEvent(${evt.id})">Edit</button>
              <button class="btn-sm btn-delete" onclick="deleteEvent(${evt.id})">Delete</button>
              <button class="btn-sm btn-edit" onclick="openFormBuilder(${evt.id})">Edit Form</button>
              <button class="btn-sm btn-edit" onclick="copyRegistrationLink(${evt.id})">Copy Link</button>
            </div>
          </div>
        `;
      });
    } else {
      html = '<div class="empty-state"><p>No events yet</p></div>';
    }
    document.getElementById('eventsList').innerHTML = html;
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

function openAddEvent() {
  currentEdit = null;
  document.getElementById('modalTitle').textContent = 'New Event';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label>Event Title <span style="color: red;">*</span></label>
      <input type="text" id="evtTitle" placeholder="e.g., Annual Charity Gala">
    </div>
    
    <div class="form-group">
      <label>Select Date <span style="color: red;">*</span></label>
      <input type="date" id="evtDatePicker">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Start Time (Optional)</label>
        <input type="time" id="evtStartTime">
      </div>
      <div class="form-group">
        <label>End Time (Optional)</label>
        <input type="time" id="evtEndTime">
      </div>
    </div>

    <div class="form-group">
      <label>Location (Optional)</label>
      <input type="text" id="evtLocation" placeholder="e.g., Main Courtyard">
    </div>

    <div class="form-group">
      <label>Description <span style="color: red;">*</span></label>
      <textarea id="evtDescription" placeholder="Write a short description about the event..."></textarea>
    </div>

    <hr style="border:0; border-top:1px solid rgba(0,0,0,0.1); margin:20px 0;">

    <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
      <input type="checkbox" id="evtFeatured" style="width:auto; height:auto;">
      <label style="margin-bottom:0; cursor:pointer;" for="evtFeatured">⭐ Highlight as Featured Event</label>
    </div>

    <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
      <input type="checkbox" id="evtClosed" style="width:auto; height:auto;">
      <label style="margin-bottom:0; cursor:pointer;" for="evtClosed">🚫 Close Registration (Stop accepting responses)</label>
    </div>

    <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
      <input type="checkbox" id="evtExternal" style="width:auto; height:auto;" onchange="document.getElementById('extUrlGroup').style.display = this.checked ? 'block' : 'none'">
      <label style="margin-bottom:0; cursor:pointer;" for="evtExternal">🔗 Use External Registration Form (Google Forms/Typeform)</label>
    </div>

    <div class="form-group" id="extUrlGroup" style="display:none; margin-left: 25px;">
      <label>External Registration URL</label>
      <input type="text" id="evtRedirectUrl" placeholder="https://forms.google.com/...">
    </div>

    <button class="btn-save" style="margin-top:20px;" onclick="saveEvent()">Save Event</button>
  `;
  document.getElementById('modal').classList.add('active');
}

async function editEvent(id) {
  try {
    const { data } = await client.from('events').select('*').eq('id', id).single();
    currentEdit = id;
    document.getElementById('modalTitle').textContent = 'Edit Event';
    
    let parsedDate = "";
    if (data.event_date) {
      const d = new Date(data.event_date);
      if (!isNaN(d.getTime())) {
        parsedDate = d.toISOString().split('T')[0];
      }
    }

    document.getElementById('modalBody').innerHTML = `
      <div class="form-group">
        <label>Event Title <span style="color: red;">*</span></label>
        <input type="text" id="evtTitle" value="${data.title || ''}">
      </div>
      
      <div class="form-group">
        <label>Select Date <span style="color: red;">*</span></label>
        <input type="date" id="evtDatePicker" value="${parsedDate}">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Start Time (Optional)</label>
          <input type="text" id="evtStartTime" value="${data.start_time || ''}" placeholder="e.g., 12:00 PM">
        </div>
        <div class="form-group">
          <label>End Time (Optional)</label>
          <input type="text" id="evtEndTime" value="${data.end_time || ''}" placeholder="e.g., 5:00 PM">
        </div>
      </div>

      <div class="form-group">
        <label>Location (Optional)</label>
        <input type="text" id="evtLocation" value="${data.location || ''}">
      </div>

      <div class="form-group">
        <label>Description <span style="color: red;">*</span></label>
        <textarea id="evtDescription">${data.description || ''}</textarea>
      </div>

      <hr style="border:0; border-top:1px solid rgba(0,0,0,0.1); margin:20px 0;">

      <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <input type="checkbox" id="evtFeatured" style="width:auto; height:auto;" ${data.is_featured ? 'checked' : ''}>
        <label style="margin-bottom:0; cursor:pointer;" for="evtFeatured">⭐ Highlight as Featured Event</label>
      </div>

      <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <input type="checkbox" id="evtClosed" style="width:auto; height:auto;" ${data.registration_closed ? 'checked' : ''}>
        <label style="margin-bottom:0; cursor:pointer;" for="evtClosed">🚫 Close Registration (Stop accepting responses)</label>
      </div>

      <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <input type="checkbox" id="evtExternal" style="width:auto; height:auto;" ${data.use_external_link ? 'checked' : ''} onchange="document.getElementById('extUrlGroup').style.display = this.checked ? 'block' : 'none'">
        <label style="margin-bottom:0; cursor:pointer;" for="evtExternal">🔗 Use External Registration Form (Google Forms/Typeform)</label>
      </div>

      <div class="form-group" id="extUrlGroup" style="display: ${data.use_external_link ? 'block' : 'none'}; margin-left: 25px;">
        <label>External Registration URL</label>
        <input type="text" id="evtRedirectUrl" value="${data.redirect_url || ''}">
      </div>

      <button class="btn-save" style="margin-top:20px;" onclick="saveEvent()">Update Event</button>
    `;
    document.getElementById('modal').classList.add('active');
  } catch (error) {
    alert('Error loading event: ' + error.message);
  }
}

async function saveEvent() {
  const title = document.getElementById('evtTitle').value.trim();
  const description = document.getElementById('evtDescription').value.trim();
  const datePickerValue = document.getElementById('evtDatePicker').value;
  const start_time = document.getElementById('evtStartTime').value || '';
  const end_time = document.getElementById('evtEndTime').value || '';
  const location = document.getElementById('evtLocation').value.trim() || '';
  const is_featured = document.getElementById('evtFeatured').checked;
  const registration_closed = document.getElementById('evtClosed').checked;
  const use_external_link = document.getElementById('evtExternal').checked;
  const redirect_url = document.getElementById('evtRedirectUrl').value.trim();

  if (!title || !description || !datePickerValue) {
    alert('Please fill in all required fields marked with a red asterisk (*)');
    return;
  }

  const dateObj = new Date(datePickerValue);
  const monthsArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const month = monthsArray[dateObj.getMonth()].substring(0,3).toUpperCase();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const event_date = `${monthsArray[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

  try {
    const eventData = { title, description, event_date, start_time, end_time, location, month, day, is_featured, registration_closed, use_external_link, redirect_url };
    if (currentEdit) {
      await client.from('events').update(eventData).eq('id', currentEdit);
    } else {
      await client.from('events').insert([eventData]);
    }
    closeModal();
    
    if (typeof loadEvents === "function") {
      loadEvents();
    }
  } catch (error) {
    alert('Error saving: ' + error.message);
  }
}

async function deleteEvent(id) {
  if (confirm('Delete this event?')) {
    try {
      await client.from('events').delete().eq('id', id);
      loadEvents();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  }
}

// ==========================================
// ===== REGISTRATION FORM BUILDER MODULE =====
// ==========================================

function openFormBuilder(eventId = null) {
  currentFormFieldId = null;
  currentFormEventId = eventId;
  document.getElementById('formBuilderEvent').value = eventId || '';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-section="registrationForms"]').classList.add('active');
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById('registrationForms').classList.add('active');
  loadFormBuilderEvents();
  loadFormFields();
}

async function loadFormBuilderEvents() {
  try {
    const { data, error } = await client.from('events').select('id,title').order('created_at', { ascending: false });
    if (error) throw error;
    const select = document.getElementById('formBuilderEvent');
    const selectedValue = select.value;
    select.innerHTML = '<option value="">Select an event</option>';
    data.forEach(evt => {
      select.innerHTML += `<option value="${evt.id}" ${evt.id == selectedValue ? 'selected' : ''}>${evt.title}</option>`;
    });
    if (currentFormEventId && !selectedValue) {
      select.value = currentFormEventId;
    }
  } catch (error) {
    console.error('Error loading form builder events:', error);
  }
}

async function loadFormFields() {
  const selectedEventId = document.getElementById('formBuilderEvent').value;
  if (!selectedEventId) {
    document.getElementById('formFieldsList').innerHTML = '<div class="empty-state"><p>Select an event above to manage its registration form.</p></div>';
    return;
  }
  currentFormEventId = selectedEventId;
  try {
    const { data, error } = await client
      .from('registration_form_fields')
      .select('*')
      .eq('event_id', selectedEventId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    let html = '';
    if (data && data.length > 0) {
      data.forEach((field, index) => {
        const optionsText = field.options ? field.options : 'No options';
        html += `
          <div class="card">
            <div class="card-content">
              <h3>${field.label}</h3>
              <div class="field-meta">
                <span class="field-badge">${field.type.replace('_', ' ')}</span>
                <span>${field.required ? 'Required' : 'Optional'}</span>
                <span>Order: ${field.sort_order ?? index}</span>
              </div>
              <small>${field.options ? 'Options: ' + optionsText : 'No options needed for this field type'}</small>
            </div>
            <div class="card-actions">
              <button class="btn-sm btn-secondary btn-mini" onclick="moveFormField(${field.id}, 'up')">Move Up</button>
              <button class="btn-sm btn-secondary btn-mini" onclick="moveFormField(${field.id}, 'down')">Move Down</button>
              <button class="btn-sm btn-edit btn-mini" onclick="editField(${field.id})">Edit</button>
              <button class="btn-sm btn-delete btn-mini" onclick="deleteFormField(${field.id})">Delete</button>
            </div>
          </div>
        `;
      });
    } else {
      html = '<div class="empty-state"><p>No fields configured for this event yet.</p></div>';
    }
    document.getElementById('formFieldsList').innerHTML = html;
  } catch (error) {
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      document.getElementById('formFieldsList').innerHTML = '<div class="empty-state"><p>The registration form schema is missing in Supabase. Run the SQL migration from SUPABASE_SETUP.md to create registration_form_fields.</p></div>';
      return;
    }
    console.error('Error loading form fields:', error);
  }
}

function renderFormPreview(fields) {
  const preview = document.getElementById('formPreview');
  if (!fields || fields.length === 0) {
    preview.innerHTML = '<div class="empty-state"><p>No fields available for preview.</p></div>';
    return;
  }

  let html = '';
  fields.forEach(field => {
    const requiredStar = field.required ? ' <span style="color:#c0392b">*</span>' : '';
    const options = parseOptions(field.options);
    let control = '';

    switch (field.type) {
      case 'short_text':
        control = '<input type="text" placeholder="Short answer" disabled>';
        break;
      case 'paragraph':
        control = '<textarea placeholder="Long answer" disabled></textarea>';
        break;
      case 'multiple_choice':
        control = '<div class="preview-multichoice">' + options.map(opt => {
          if (opt.toLowerCase().includes('other')) {
            return `<label style="display:block;margin-bottom:4px;"><input type="radio" disabled> ${opt}</label><input type="text" placeholder="Please specify" disabled style="margin-left:20px;margin-bottom:8px;width:200px;display:none;">`;
          }
          return `<label style="display:block;margin-bottom:4px;"><input type="radio" disabled> ${opt}</label>`;
        }).join('') + '</div>';
        break;
      case 'dropdown':
        control = `<select disabled style="margin-bottom:8px;"><option>${options.join('</option><option>')}</option></select>`;
        break;
      case 'checkbox':
        control = '<div class="preview-checkbox-group" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">' + options.map(opt => {
          if (opt.toLowerCase().includes('other')) {
            return `<label style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><input type="checkbox" disabled> ${opt}</label><input type="text" placeholder="Please specify" disabled style="margin-left:26px;width:200px;display:none;">`;
          }
          return `<label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" disabled> ${opt}</label>`;
        }).join('') + '</div>';
        break;
      default:
        control = '<input type="text" placeholder="Answer" disabled>';
    }

    html += `
      <div class="preview-field">
        <label>${field.label}${requiredStar}</label>
        ${control}
        ${field.required ? '<small>Required question</small>' : '<small>Optional question</small>'}
      </div>
    `;
  });

  preview.innerHTML = html;
}

function parseOptions(options) {
  return options ? options.split(',').map(opt => opt.trim()).filter(Boolean) : [];
}

function toggleFieldOptions() {
  const type = document.getElementById('fieldType')?.value;
  const optionsGroup = document.getElementById('fieldOptionsGroup');
  if (!optionsGroup) return;
  if (['multiple_choice', 'dropdown', 'checkbox'].includes(type)) {
    optionsGroup.style.display = 'block';
  } else {
    optionsGroup.style.display = 'none';
  }
}

function previewForm() {
  const eventId = currentFormEventId || document.getElementById('formBuilderEvent').value;
  if (!eventId) {
    alert('Please select an event first to preview the form.');
    return;
  }
  const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
  window.open(`${base}register.html?event_id=${eventId}`, '_blank');
}

async function moveFormField(fieldId, direction) {
  const eventId = currentFormEventId || document.getElementById('formBuilderEvent').value;
  if (!eventId) return;

  const { data, error } = await client
    .from('registration_form_fields')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error loading field order:', error);
    return;
  }

  const index = data.findIndex(field => field.id === fieldId);
  if (index === -1) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= data.length) return;

  const current = data[index];
  const target = data[targetIndex];

  try {
    await client.from('registration_form_fields').update({ sort_order: target.sort_order }).eq('id', current.id);
    await client.from('registration_form_fields').update({ sort_order: current.sort_order }).eq('id', target.id);
    loadFormFields();
  } catch (updateError) {
    console.error('Error moving field:', updateError);
  }
}

function openAddField(defaultType = 'short_text') {
  const eventId = currentFormEventId || document.getElementById('formBuilderEvent').value;
  if (!eventId) {
    alert('Please select an event before adding fields.');
    return;
  }
  currentFormFieldId = null;
  document.getElementById('modalTitle').textContent = 'Add Registration Field';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label>Field Label</label>
      <input type="text" id="fieldLabel" placeholder="e.g. Favorite color">
    </div>
    <div class="form-group">
      <label>Field Type</label>
      <select id="fieldType" onchange="toggleFieldOptions()">
        <option value="short_text" ${defaultType === 'short_text' ? 'selected' : ''}>Short answer</option>
        <option value="paragraph" ${defaultType === 'paragraph' ? 'selected' : ''}>Paragraph</option>
        <option value="multiple_choice" ${defaultType === 'multiple_choice' ? 'selected' : ''}>Multiple choice</option>
        <option value="dropdown" ${defaultType === 'dropdown' ? 'selected' : ''}>Dropdown</option>
        <option value="checkbox" ${defaultType === 'checkbox' ? 'selected' : ''}>Checkbox</option>
      </select>
    </div>
    <div class="form-group" id="fieldOptionsGroup">
      <label>Options</label>
      <div id="optionsList"></div>
      <button type="button" class="btn-secondary btn-mini" onclick="addOption()">+ Add Option</button>
      <small style="color: var(--gray-text);">Add options for dropdown, multiple choice, or checkbox fields.</small>
    </div>
    <div class="form-group">
      <label>Required</label>
      <select id="fieldRequired">
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
    <div class="form-group">
      <label>Sort Order</label>
      <input type="number" id="fieldOrder" value="0" min="0">
    </div>
    <button class="btn-save" onclick="saveFormField()">Save Field</button>
  `;
  document.getElementById('modal').classList.add('active');
  toggleFieldOptions();
  populateOptions('');
}

async function editField(id) {
  try {
    const { data, error } = await client.from('registration_form_fields').select('*').eq('id', id).single();
    if (error) throw error;
    currentFormFieldId = id;
    currentFormEventId = data.event_id;
    document.getElementById('modalTitle').textContent = 'Edit Registration Field';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-group">
        <label>Field Label</label>
        <input type="text" id="fieldLabel" value="${data.label}">
      </div>
      <div class="form-group">
        <label>Field Type</label>
        <select id="fieldType" onchange="toggleFieldOptions()">
          <option value="short_text" ${data.type === 'short_text' ? 'selected' : ''}>Short answer</option>
          <option value="paragraph" ${data.type === 'paragraph' ? 'selected' : ''}>Paragraph</option>
          <option value="multiple_choice" ${data.type === 'multiple_choice' ? 'selected' : ''}>Multiple choice</option>
          <option value="dropdown" ${data.type === 'dropdown' ? 'selected' : ''}>Dropdown</option>
          <option value="checkbox" ${data.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
        </select>
      </div>
      <div class="form-group" id="fieldOptionsGroup">
        <label>Options</label>
        <div id="optionsList"></div>
        <button type="button" class="btn-secondary btn-mini" onclick="addOption()">+ Add Option</button>
        <small style="color: var(--gray-text);">Add options for dropdown, multiple choice, or checkbox fields.</small>
      </div>
      <div class="form-group">
        <label>Required</label>
        <select id="fieldRequired">
          <option value="true" ${data.required ? 'selected' : ''}>Yes</option>
          <option value="false" ${!data.required ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sort Order</label>
        <input type="number" id="fieldOrder" value="${data.sort_order || 0}" min="0">
      </div>
      <button class="btn-save" onclick="saveFormField()">Update Field</button>
    `;
    document.getElementById('modal').classList.add('active');
    toggleFieldOptions();
    populateOptions(data.options);
  } catch (error) {
    alert('Error loading field: ' + error.message);
  }
}

async function saveFormField() {
  const event_id = currentFormEventId || document.getElementById('formBuilderEvent').value;
  const label = document.getElementById('fieldLabel').value.trim();
  const type = document.getElementById('fieldType').value;
  const required = document.getElementById('fieldRequired').value === 'true';
  const sort_order = parseInt(document.getElementById('fieldOrder').value, 10) || 0;

  const optionInputs = document.querySelectorAll('#optionsList input');
  const options = Array.from(optionInputs).map(input => input.value.trim()).filter(val => val).join(', ');

  if (!event_id || !label || !type) {
    alert('Please fill all required field settings');
    return;
  }

  const fieldData = { event_id: parseInt(event_id, 10), label, type, options, required, sort_order };
  try {
    if (currentFormFieldId) {
      await client.from('registration_form_fields').update(fieldData).eq('id', currentFormFieldId);
    } else {
      await client.from('registration_form_fields').insert([fieldData]);
    }
    closeModal();
    loadFormBuilderEvents();
    loadFormFields();
  } catch (error) {
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      alert('The registration form table is not available in Supabase. Create the registration_form_fields table first.');
      return;
    }
    alert('Error saving field: ' + error.message);
  }
}

async function deleteFormField(id) {
  if (!confirm('Delete this registration field?')) return;
  try {
    await client.from('registration_form_fields').delete().eq('id', id);
    loadFormFields();
  } catch (error) {
    alert('Error deleting field: ' + error.message);
  }
}

function addOption(value = '') {
  const optionsList = document.getElementById('optionsList');
  const optionDiv = document.createElement('div');
  optionDiv.className = 'option-item';
  optionDiv.innerHTML = `
    <input type="text" placeholder="Option text" value="${value}" style="flex: 1; margin-right: 10px;">
    <button type="button" class="btn-sm btn-delete" onclick="removeOption(this)">Remove</button>
  `;
  optionsList.appendChild(optionDiv);
}

function removeOption(button) {
  button.parentElement.remove();
}

function populateOptions(optionsString) {
  const optionsList = document.getElementById('optionsList');
  optionsList.innerHTML = '';
  if (optionsString) {
    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
    options.forEach(option => addOption(option));
  }
}

  // ===== INITIATIVES =====
  async function loadInitiatives() {
    try {
      const { data, error } = await client
        .from('initiatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let html = '';
      if (data && data.length > 0) {
        data.forEach(init => {
          html += `
            <div class="card">
              <div class="card-content">
                <h3>${init.title}</h3>
                <p>${init.description.substring(0, 80)}...</p>
                <small>Progress: ${init.progress_percentage}%</small>
              </div>
              <div class="card-actions">
                <button class="btn-sm btn-edit" onclick="editInitiative(${init.id})">Edit</button>
                <button class="btn-sm btn-delete" onclick="deleteInitiative(${init.id})">Delete</button>
              </div>
            </div>
          `;
        });
      } else {
        html = '<div class="empty-state"><p>No initiatives yet</p></div>';
      }
      document.getElementById('initiativesList').innerHTML = html;
    } catch (error) {
      console.error('Error loading initiatives:', error);
    }
  }

  function openAddInitiative() {
    currentEdit = null;
    document.getElementById('modalTitle').textContent = 'New Initiative';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="initTitle" placeholder="Initiative title">
      </div>
      <div class="form-group">
        <label>Emoji</label>
        <input type="text" id="initEmoji" placeholder="Icon">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="initDescription" placeholder="Initiative description"></textarea>
      </div>
      <div class="form-group">
        <label>Progress %</label>
        <input type="number" id="initProgress" placeholder="75" min="0" max="100">
      </div>
      <div class="form-group">
        <label>Theme (t1-t6)</label>
        <input type="text" id="initTheme" placeholder="t1">
      </div>
      <button class="btn-save" onclick="saveInitiative()">Save Initiative</button>
    `;
    document.getElementById('modal').classList.add('active');
  }

  async function editInitiative(id) {
    try {
      const { data } = await client.from('initiatives').select('*').eq('id', id).single();
      currentEdit = id;
      document.getElementById('modalTitle').textContent = 'Edit Initiative';
      document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="initTitle" value="${data.title}">
        </div>
        <div class="form-group">
          <label>Emoji</label>
          <input type="text" id="initEmoji" value="${data.emoji}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="initDescription">${data.description}</textarea>
        </div>
        <div class="form-group">
          <label>Progress %</label>
          <input type="number" id="initProgress" value="${data.progress_percentage}" min="0" max="100">
        </div>
        <div class="form-group">
          <label>Theme</label>
          <input type="text" id="initTheme" value="${data.theme}">
        </div>
        <button class="btn-save" onclick="saveInitiative()">Update Initiative</button>
      `;
      document.getElementById('modal').classList.add('active');
    } catch (error) {
      alert('Error loading initiative: ' + error.message);
    }
  }

  async function saveInitiative() {
    const title = document.getElementById('initTitle').value;
    const description = document.getElementById('initDescription').value;
    const emoji = document.getElementById('initEmoji').value;
    const progress_percentage = parseInt(document.getElementById('initProgress').value) || 0;
    const theme = document.getElementById('initTheme').value;

    if (!title || !description) {
      alert('Please fill all fields');
      return;
    }

    try {
      const data = { title, description, emoji, progress_percentage, theme };
      if (currentEdit) {
        await client.from('initiatives').update(data).eq('id', currentEdit);
      } else {
        await client.from('initiatives').insert([data]);
      }
      closeModal();
      loadInitiatives();
    } catch (error) {
      alert('Error saving: ' + error.message);
    }
  }

  async function deleteInitiative(id) {
    if (confirm('Delete this initiative?')) {
      try {
        await client.from('initiatives').delete().eq('id', id);
        loadInitiatives();
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  }

  // ===== REGISTRATIONS =====
  async function loadRegistrations() {
    try {
      // Load events with registrations
      const { data: events, error: eventsError } = await client
        .from('events')
        .select('id, title, event_date')
        .eq('active', true)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Load all registrations
      const { data: registrations, error: regError } = await client
        .from('event_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (regError) throw regError;

      // Group registrations by event
      const registrationsByEvent = {};
      registrations.forEach(reg => {
        if (!registrationsByEvent[reg.event_id]) {
          registrationsByEvent[reg.event_id] = [];
        }
        registrationsByEvent[reg.event_id].push(reg);
      });

      let html = '';
      if (events && events.length > 0) {
        events.forEach(event => {
          const eventRegs = registrationsByEvent[event.id] || [];
          const participantCount = eventRegs.length;

          html += `
            <div class="event-registrations">
              <div class="event-header">
                <h3>${event.title}</h3>
                <div class="event-meta">
                  <span>${event.event_date}</span>
                  <span>${participantCount} participant${participantCount !== 1 ? 's' : ''}</span>
                  ${participantCount > 0 ? `<button class="btn-sm btn-primary" onclick="exportToExcel(${event.id}, '${event.title.replace(/'/g, "\\'")}')">Export to Excel</button>` : ''}
                </div>
              </div>
              <div class="participants-list">
          `;

          if (eventRegs.length > 0) {
            eventRegs.forEach(reg => {
              const responseLines = reg.responses ? Object.entries(reg.responses).map(([label, answer]) => `<div style="font-size:13px; margin-top:6px;"><strong>${label}:</strong> ${answer || '—'}</div>`).join('') : '';
              html += `
                <div class="card">
                  <div class="card-content">
                    <h4>${reg.first_name} ${reg.last_name}</h4>
                    <p>${reg.email}</p>
                    <small>Grade: ${reg.grade}</small>
                    ${responseLines}
                  </div>
                  ${currentUser.role === 'admin' ? `<div class="card-actions">
                    <button class="btn-sm btn-delete" onclick="deleteRegistration(${reg.id})">Remove</button>
                  </div>` : ''}
                </div>
              `;
            });
          } else {
            html += '<div class="empty-state"><p>No registrations yet</p></div>';
          }

          html += `
              </div>
            </div>
          `;
        });
      } else {
        html = '<div class="empty-state"><p>No events found</p></div>';
      }
      document.getElementById('registrationsList').innerHTML = html;
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  }

  async function deleteRegistration(id) {
    if (confirm('Delete this registration?')) {
      try {
        await client.from('event_registrations').delete().eq('id', id);
        loadRegistrations();
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  }

  async function exportToExcel(eventId, eventTitle) {
    try {
      const { data: registrations, error } = await client
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!registrations || registrations.length === 0) {
        alert('No registrations to export');
        return;
      }

      // Prepare data for Excel
      const excelData = registrations.map(reg => {
        const baseData = {
          'First Name': reg.first_name,
          'Last Name': reg.last_name,
          'Email': reg.email,
          'Grade': reg.grade,
          'Registration Date': new Date(reg.created_at).toLocaleDateString()
        };

        // Add custom responses
        if (reg.responses) {
          Object.entries(reg.responses).forEach(([label, answer]) => {
            baseData[label] = answer || '';
          });
        }

        return baseData;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = Object.keys(excelData[0]).map(key => ({ wch: Math.max(key.length, 15) }));
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

      // Generate filename
      const filename = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_registrations.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting: ' + error.message);
    }
  }

  // ===== CONTACT SUBMISSIONS =====
  async function loadContact() {
    try {
      const { data, error } = await client
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let html = '';
      if (data && data.length > 0) {
        data.forEach(contact => {
          const senderName = contact.first_name && contact.last_name ? `${contact.first_name} ${contact.last_name}` : 'Anonymous';
          const senderInfo = contact.email ? `<small>${contact.email}</small>` : (contact.grade ? `<small>Grade: ${contact.grade}</small>` : '');
          html += `
            <div class="card">
              <div class="card-content">
                <h3>${senderName}</h3>
                <p><strong>Subject:</strong> ${contact.subject}</p>
                <p>${contact.message.substring(0, 100)}...</p>
                ${senderInfo}
              </div>
              <div class="card-actions">
                <button class="btn-sm btn-edit" onclick="viewContact(${contact.id})">View</button>
                <button class="btn-sm btn-delete" onclick="deleteContact(${contact.id})">Delete</button>
              </div>
            </div>
          `;
        });
      } else {
        html = '<div class="empty-state"><p>No submissions yet</p></div>';
      }
      document.getElementById('contactList').innerHTML = html;
    } catch (error) {
      console.error('Error loading contact submissions:', error);
    }
  }

  async function viewContact(id) {
    try {
      const { data } = await client.from('contact_submissions').select('*').eq('id', id).single();
      const senderName = data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : 'Anonymous';
      const senderInfo = data.email ? `${data.email}` : (data.grade ? `Grade: ${data.grade}` : 'No contact information provided');
      document.getElementById('modalTitle').textContent = 'Contact Submission';
      document.getElementById('modalBody').innerHTML = `
        <div class="success-msg">
          <strong>${senderName}</strong><br>
          ${senderInfo}
        </div>
        <h4 style="margin-bottom: 8px; color: var(--navy);">Subject: ${data.subject}</h4>
        <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${data.message}</p>
        <small style="color: var(--gray-text);">Submitted: ${new Date(data.created_at).toLocaleString()}</small>
      `;
      document.getElementById('modal').classList.add('active');
    } catch (error) {
      alert('Error loading contact: ' + error.message);
    }
  }

  async function deleteContact(id) {
    if (confirm('Delete this submission?')) {
      try {
        await client.from('contact_submissions').delete().eq('id', id);
        loadContact();
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  }

  // ===== SURVEY =====
  async function copyRegistrationLink(eventId) {
    const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const link = `${base}register.html?event_id=${eventId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Registration link copied!');
    }).catch(() => {
      alert('Copy failed. Please copy manually: ' + link);
    });
  }

  async function loadSurvey() {
    try {
      // Load active survey
      const { data: activeSurvey, error: activeSurveyError } = await client
        .from('surveys')
        .select('*')
        .eq('active', true)
        .single();

      if (activeSurvey) {
        let questions = activeSurvey.questions;
        if (typeof questions === 'string') {
          questions = JSON.parse(questions);
        }

        const questionCount = questions.length;
        const externalBadge = activeSurvey.use_external_link ? ' <span class="field-badge" style="background:#fce8e6; color:#9f2a26; margin-left: 8px;">External</span>' : '';
        document.getElementById('activeSurveyInfo').innerHTML = `
          <strong>${activeSurvey.title || 'Untitled Survey'}</strong>${externalBadge}<br>
          <small>${activeSurvey.use_external_link ? 'Redirects to: ' + activeSurvey.redirect_url : questionCount + ' question' + (questionCount !== 1 ? 's' : '')}</small>
        `;
        
        // Show survey link
        const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const surveyLink = `${base}survey.html?survey_id=${activeSurvey.id}`;
        document.getElementById('surveyLinkInput').value = surveyLink;
        document.getElementById('surveyLinkContainer').style.display = 'block';
        
        document.getElementById('activeSurveyActions').innerHTML = `
          <button class="btn-sm btn-edit" onclick="editSurvey(${activeSurvey.id})">Edit</button>
          <button class="btn-sm btn-edit" onclick="deactivateSurvey(${activeSurvey.id})">Deactivate</button>
          <button class="btn-sm btn-primary" onclick="makeMainSurvey(${activeSurvey.id})">Make Main Survey</button>
          <button class="btn-sm btn-delete" onclick="deleteSurveyById(${activeSurvey.id})">Delete</button>
        `;
      } else {
        document.getElementById('activeSurveyInfo').textContent = 'No active survey';
        document.getElementById('activeSurveyActions').innerHTML = '';
        document.getElementById('surveyLinkContainer').style.display = 'none';
        document.getElementById('surveyList').innerHTML = '<div class="empty-state"><p>No active survey. Activate a survey to see responses here.</p></div>';
        return;
      }

      // Load responses for the active survey only
      const { data: responses, error: responseError } = await client
        .from('survey_responses')
        .select('*')
        .eq('survey_id', activeSurvey.id)
        .order('submitted_at', { ascending: false });

      if (responseError) throw responseError;

      let html = '';
      if (responses && responses.length > 0) {
        html += `<div class="response-count">Showing ${responses.length} response${responses.length !== 1 ? 's' : ''} for this survey</div>`;
        responses.forEach(response => {
          const responseText = response.responses ? Object.entries(response.responses).map(([q, a]) => `<div style="font-size:12px; margin-top:6px;"><strong>${q}:</strong> ${a || '—'}</div>`).join('') : '';
          html += `
            <div class="card">
              <div class="card-content">
                <h3>Survey Response #${response.id}</h3>
                <small>${new Date(response.submitted_at).toLocaleString()}</small>
                ${responseText}
              </div>
              <div class="card-actions">
                <button class="btn-sm btn-delete" onclick="deleteSurveyResponse(${response.id})">Delete</button>
              </div>
            </div>
          `;
        });
      } else {
        html = '<div class="empty-state"><p>No survey responses yet for this survey</p></div>';
      }
      document.getElementById('surveyList').innerHTML = html;
    } catch (error) {
      console.error('Error loading survey:', error);
    }
  }

  function copySurveyLink() {
    const link = document.getElementById('surveyLinkInput').value;
    navigator.clipboard.writeText(link).then(() => {
      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }).catch(() => {
      alert('Could not copy. Please copy manually: ' + link);
    });
  }

  async function makeMainSurvey(surveyId) {
    try {
      // Deactivate any existing main survey and activate the selected survey
      await client.from('surveys').update({ main: false, active: false }).neq('id', surveyId);
      
      const { error } = await client
        .from('surveys')
        .update({ main: true, active: true })
        .eq('id', surveyId);
      
      if (error) throw error;
      
      alert('Survey set as main survey and activated successfully!');
      loadSurvey(); // Refresh the survey list
    } catch (error) {
      console.error('Error setting main survey:', error);
      alert('Error setting main survey: ' + error.message);
    }
  }

  function openSurveyBuilder() {
    currentEdit = null;
    document.getElementById('modalTitle').textContent = 'Create New Survey';
    
    const defaultQuestions = [
      { question: 'What aspects of school do you enjoy most?', type: 'checkbox', options: ['Events', 'Classes', 'Clubs', 'Sports', 'Other'], required: true },
      { question: 'How satisfied are you with school events?', type: 'radio', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'], required: true },
      { question: 'What can we improve?', type: 'textarea', required: false }
    ];

    document.getElementById('modalBody').innerHTML = `
      <div class="form-group">
        <label>Survey Title</label>
        <input type="text" id="surveyTitle" placeholder="e.g., School Experience Feedback">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Use External Survey?</label>
          <input type="checkbox" id="surveyExternal"> Redirect to external link
        </div>
        <div class="form-group">
          <label>External Survey URL</label>
          <input type="text" id="surveyRedirectUrl" placeholder="https://forms.google.com/...">
        </div>
      </div>
      <div id="questionsBuilder"></div>
      <button class="btn-secondary" onclick="addSurveyQuestion()" style="margin-top: 16px; padding: 10px 16px; width: auto;">+ Add Question</button>
      <button class="btn-save" onclick="saveSurvey()">Create Survey</button>
    `;
    
    // Initialize with default questions
    const builder = document.getElementById('questionsBuilder');
    builder.innerHTML = '';
    defaultQuestions.forEach((q, idx) => {
      renderSurveyQuestion(idx, q, builder);
    });
    
    document.getElementById('modal').classList.add('active');
  }

  function renderSurveyQuestion(idx, question, container) {
    const questionDiv = document.createElement('div');
    questionDiv.id = `question-${idx}`;
    questionDiv.style.cssText = 'background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.05);';
    
    let typeOptions = `
      <option value="text">Short Text</option>
      <option value="textarea">Long Text</option>
      <option value="radio">Multiple Choice</option>
      <option value="checkbox">Checkboxes</option>
    `;
    
    let optionsHtml = '';
    if (question.type === 'radio' || question.type === 'checkbox') {
      optionsHtml = `
        <label style="margin-top: 10px;">Options (comma-separated)</label>
        <input type="text" value="${question.options.join(', ')}" onchange="updateSurveyQuestionOptions(${idx}, this.value)" style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; font-size: 13px;">
      `;
    }
    
    questionDiv.innerHTML = `
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <input type="text" value="${question.question}" placeholder="Question text" onchange="updateSurveyQuestion(${idx}, this.value)" style="flex: 1; padding: 8px; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; font-size: 13px;">
        <button type="button" onclick="removeSurveyQuestion(${idx})" style="padding: 6px 12px; background: var(--red-accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Remove</button>
      </div>
      <label style="font-size: 12px;">Type</label>
      <select onchange="changeSurveyQuestionType(${idx}, this.value)" style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; font-size: 13px; margin-bottom: 10px;">
        ${typeOptions}
      </select>
      ${optionsHtml}
      <label style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
        <input type="checkbox" ${question.required ? 'checked' : ''} onchange="updateSurveyQuestionRequired(${idx}, this.checked)">
        <span style="font-size: 13px;">Required</span>
      </label>
    `;
    
    // Set selected type
    questionDiv.querySelector('select').value = question.type;
    
    container.appendChild(questionDiv);
  }

  let surveyQuestions = [
    { question: 'What aspects of school do you enjoy most?', type: 'checkbox', options: ['Events', 'Classes', 'Clubs', 'Sports', 'Other'], required: true },
    { question: 'How satisfied are you with school events?', type: 'radio', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'], required: true },
    { question: 'What can we improve?', type: 'textarea', required: false }
  ];

  function updateSurveyQuestion(idx, value) {
    surveyQuestions[idx].question = value;
  }

  function updateSurveyQuestionType(idx, type) {
    surveyQuestions[idx].type = type;
  }

  function updateSurveyQuestionOptions(idx, value) {
    surveyQuestions[idx].options = value.split(',').map(o => o.trim()).filter(o => o);
  }

  function updateSurveyQuestionRequired(idx, required) {
    surveyQuestions[idx].required = required;
  }

  function changeSurveyQuestionType(idx, type) {
    surveyQuestions[idx].type = type;
    const container = document.getElementById('questionsBuilder');
    container.innerHTML = '';
    surveyQuestions.forEach((q, i) => renderSurveyQuestion(i, q, container));
  }

  function addSurveyQuestion() {
    surveyQuestions.push({ question: 'New Question', type: 'text', options: [], required: false });
    const container = document.getElementById('questionsBuilder');
    container.innerHTML = '';
    surveyQuestions.forEach((q, i) => renderSurveyQuestion(i, q, container));
  }

  function removeSurveyQuestion(idx) {
    surveyQuestions.splice(idx, 1);
    const container = document.getElementById('questionsBuilder');
    container.innerHTML = '';
    surveyQuestions.forEach((q, i) => renderSurveyQuestion(i, q, container));
  }

  async function saveSurvey() {
    const title = document.getElementById('surveyTitle').value;
    const use_external_link = document.getElementById('surveyExternal').checked;
    const redirect_url = document.getElementById('surveyRedirectUrl').value;
    if (!title) {
      alert('Please enter a survey title');
      return;
    }

    if (!use_external_link && surveyQuestions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    try {
      // Deactivate any existing active surveys
      const { data: activeSurveys } = await client.from('surveys').select('id').eq('active', true);
      if (activeSurveys && activeSurveys.length > 0) {
        await client.from('surveys').update({ active: false }).eq('active', true);
      }

      // Create new survey
      const { error } = await client.from('surveys').insert([{
        title,
        questions: surveyQuestions,
        use_external_link,
        redirect_url,
        active: true,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      alert('Survey created successfully!');
      closeModal();
      loadSurvey();
      surveyQuestions = [];
    } catch (error) {
      alert('Error creating survey: ' + error.message);
    }
  }

  async function editSurvey(surveyId) {
    try {
      const { data } = await client.from('surveys').select('*').eq('id', surveyId).single();
      
      currentEdit = surveyId;
      surveyQuestions = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;
      
      document.getElementById('modalTitle').textContent = 'Edit Survey';
      
      document.getElementById('modalBody').innerHTML = `
        <div class="form-group">
          <label>Survey Title</label>
          <input type="text" id="surveyTitle" value="${data.title}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Use External Survey?</label>
            <input type="checkbox" id="surveyExternal" ${data.use_external_link ? 'checked' : ''}> Redirect to external link
          </div>
          <div class="form-group">
            <label>External Survey URL</label>
            <input type="text" id="surveyRedirectUrl" value="${data.redirect_url || ''}">
          </div>
        </div>
        <div id="questionsBuilder"></div>
        <button class="btn-secondary" onclick="addSurveyQuestion()" style="margin-top: 16px; padding: 10px 16px; width: auto;">+ Add Question</button>
        <button class="btn-save" onclick="updateSurvey(${surveyId})">Update Survey</button>
      `;
      
      const container = document.getElementById('questionsBuilder');
      container.innerHTML = '';
      surveyQuestions.forEach((q, idx) => renderSurveyQuestion(idx, q, container));
      
      document.getElementById('modal').classList.add('active');
    } catch (error) {
      alert('Error loading survey: ' + error.message);
    }
  }

  async function updateSurvey(surveyId) {
    const title = document.getElementById('surveyTitle').value;
    const use_external_link = document.getElementById('surveyExternal').checked;
    const redirect_url = document.getElementById('surveyRedirectUrl').value;
    if (!title || (!use_external_link && surveyQuestions.length === 0)) {
      alert('Please fill all fields');
      return;
    }

    try {
      await client.from('surveys').update({ title, questions: surveyQuestions, use_external_link, redirect_url }).eq('id', surveyId);
      alert('Survey updated!');
      closeModal();
      loadSurvey();
      surveyQuestions = [];
    } catch (error) {
      alert('Error updating: ' + error.message);
    }
  }

  async function deactivateSurvey(surveyId) {
    if (confirm('Deactivate this survey?')) {
      try {
        await client.from('surveys').update({ active: false }).eq('id', surveyId);
        loadSurvey();
      } catch (error) {
        alert('Error deactivating: ' + error.message);
      }
    }
  }

  async function deleteSurveyById(surveyId) {
    if (confirm('Delete this survey permanently?')) {
      try {
        await client.from('surveys').delete().eq('id', surveyId);
        loadSurvey();
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  }

  async function deleteSurveyResponse(responseId) {
    if (confirm('Delete this response?')) {
      try {
        await client.from('survey_responses').delete().eq('id', responseId);
        loadSurvey();
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  }

  // ===== SURVEY =====
  async function copyRegistrationLink(eventId) {
    const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const link = `${base}register.html?event_id=${eventId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Registration link copied!');
    }).catch(() => {
      alert('Copy failed. Please copy manually: ' + link);
    });
  }

  // ===== MODAL =====
  function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentEdit = null;
  }

  window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
      closeModal();
    }
  });