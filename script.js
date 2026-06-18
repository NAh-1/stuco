// ===== NOTIFICATION LOGIC =====
function closeNotification() {
  const notif = document.getElementById('survey-notification');
  if(notif) notif.classList.remove('show');
}

window.addEventListener('load', () => {
  // Show notification 3 seconds after the page loads
  setTimeout(() => {
    const notif = document.getElementById('survey-notification');
    if(notif) notif.classList.add('show');
  }, 3000);
});

// ===== MOBILE MENU =====
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
}

// ===== SCROLL REVEAL =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===== LOAD PAGE DATA FROM SUPABASE =====
async function loadPageData() {
  try {
    await loadAnnouncements();
    await loadEvents();
    await loadInitiatives();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

async function loadAnnouncements() {
  try {
    const { data, error } = await client
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4);

    if (error) throw error;

    if (data && data.length > 0) {
      let html = '';
      data.forEach(ann => {
        const dotClass = ann.active ? '' : ' gray';
        const clickAttr = ann.redirect_url ? `onclick="window.location.href='${ann.redirect_url}'"` : '';
        html += `
          <div class="announcement-item" ${clickAttr}>
            <div class="ann-dot${dotClass}"></div>
            <div>
              <div class="ann-date">${ann.date}</div>
              <div class="ann-title">${ann.title}</div>
              <div class="ann-text">${ann.content}</div>
            </div>
          </div>
        `;
      });
      document.getElementById('announcementsList').innerHTML = html;
    }
  } catch (error) {
    console.error('Error loading announcements:', error);
  }
}

async function loadEvents() {
  try {
    // This now organizes your events chronologically by the actual event date
    const { data, error } = await client
      .from('events')
      .select('*')
      .eq('active', true)
      .order('event_date', { ascending: true }); 

    if (error) throw error;

    if (data && data.length > 0) {
      // Find featured event
      const featured = data.find(e => e.is_featured) || data[0];
      
      // Populate featured event
      const featuredDate = featured.month ? featured.month.slice(0, 3).toUpperCase() : 'MAY';
      const featuredHtml = `
        <div class="event-featured-date">${featuredDate}</div>
        <div class="event-tag-pill">⭐ Featured Event</div>
        <h3>${featured.title}</h3>
        <p>${featured.description}</p>
        <div class="event-meta">
          <div class="event-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${featured.event_date}
          </div>
          <div class="event-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${featured.start_time} – ${featured.end_time}
          </div>
          <div class="event-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${featured.location}
          </div>
        </div>
        <a href="register.html?event_id=${featured.id}" class="btn-primary" style="font-size:13px; padding: 12px 24px;">
          Register Now →
        </a>
      `;
      document.getElementById('eventFeatured').innerHTML = featuredHtml;

      // Populate events list
      const otherEvents = data.filter(e => !e.is_featured).slice(0, 5);
      let listHtml = '';
      otherEvents.forEach(evt => {
        const month = evt.month || 'Jan';
        const day = evt.day || '01';
        listHtml += `
          <a class="event-item" href="register.html?event_id=${evt.id}">
            <div class="event-date-block"><div class="month">${month}</div><div class="day">${day}</div></div>
            <div class="event-info">
              <h4>${evt.title}</h4>
              <p>${evt.description.substring(0, 60)}...</p>
            </div>
          </a>
        `;
      });
      document.getElementById('eventsList').innerHTML = listHtml;
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

async function loadInitiatives() {
  try {
    const { data, error } = await client
      .from('initiatives')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      let html = '';
      data.forEach((init, idx) => {
        const theme = init.theme || 't' + ((idx % 6) + 1);
        const title = init.title.replace(/\n/g, '<br>');
        html += `
          <div class="initiative-card reveal">
            <div class="initiative-top ${theme}"><h3>${title}</h3></div>
            <div class="initiative-body">
              <p>${init.description}</p>
              <div class="initiative-progress">
                <div class="progress-bar"><div class="progress-fill" style="width:${init.progress_percentage}%"></div></div>
                <span class="progress-pct">${init.progress_percentage}%</span>
              </div>
            </div>
          </div>
        `;
      });
      document.getElementById('initiativesGrid').innerHTML = html;
      
      // Re-observe for animations
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }
  } catch (error) {
    console.error('Error loading initiatives:', error);
  }
}

// ===== FORM SUBMISSIONS =====
async function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target;
  
  // Collect form data (anonymous - only subject and message)
  const subject = document.querySelector('select').value;
  const message = document.querySelector('textarea').value;

  if (!subject || !message) {
    alert('Please fill in subject and message');
    return;
  }

  try {
    // Save to Supabase (only anonymous fields)
    await client.from('contact_submissions').insert([{ subject, message }]);
    
    btn.textContent = 'Message Sent!';
    btn.style.background = '#0e1e47';
    btn.style.color = '#f2b705';
    
    // Clear form
    document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(el => el.value = '');
    
    setTimeout(() => {
      btn.textContent = 'Send Message →';
      btn.style.background = '';
      btn.style.color = '';
    }, 3000);
  } catch (error) {
    alert('Error sending message: ' + error.message);
  }
}

// Load main survey link
async function loadMainSurvey() {
  try {
    const { data: mainSurvey, error } = await client
      .from('surveys')
      .select('id, title')
      .eq('main', true)
      .eq('active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    
    const surveyLink = document.querySelector('#survey a[href="survey.html"]');
    if (mainSurvey && surveyLink) {
      surveyLink.href = `survey.html?survey_id=${mainSurvey.id}`;
      surveyLink.textContent = `Take the "${mainSurvey.title}" Survey →`;
    }
  } catch (error) {
    console.error('Error loading main survey:', error);
  }
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadPageData();
  loadMainSurvey();
});

function showGoogleFormPopup() {
  document
    .getElementById("googleFormPopup")
    .classList.add("show");
}

function closeGoogleFormPopup() {
  document
    .getElementById("googleFormPopup")
    .classList.remove("show");
}

// Show popup after 2 seconds
window.addEventListener("load", () => {
  setTimeout(showGoogleFormPopup, 2000);
});