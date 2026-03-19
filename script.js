const GITHUB_USERNAME = 'webmonk';
const REPOS_TO_SHOW = 6;

// ── Dynamic greeting based on time of day ──
(function () {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 6) greeting = 'Up late? I\'m';
  else if (hour < 12) greeting = 'Good morning, I\'m';
  else if (hour < 18) greeting = 'Good afternoon, I\'m';
  else greeting = 'Good evening, I\'m';
  const el = document.getElementById('hero-greeting');
  if (el) el.textContent = greeting;
})();

// ── Dynamic footer year ──
(function () {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();

// ── Terminal typing effect ──
(function () {
  const phrases = [
    'whoami',
    'cat about.txt',
    'ls projects/',
    'echo "Let\'s build something great"',
    'git push origin main',
    `curl api.github.com/users/${GITHUB_USERNAME}`,
  ];

  const el = document.getElementById('typed-text');
  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function type() {
    const current = phrases[phraseIndex];
    if (!deleting) {
      el.textContent = current.slice(0, charIndex + 1);
      charIndex++;
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(type, 2000);
        return;
      }
      setTimeout(type, 80 + Math.random() * 40);
    } else {
      el.textContent = current.slice(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(type, 500);
        return;
      }
      setTimeout(type, 40);
    }
  }

  setTimeout(type, 1200);
})();

// ── Fetch GitHub profile & populate stats ──
async function fetchGitHubProfile() {
  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
    if (!res.ok) throw new Error('GitHub API error');
    const user = await res.json();

    // Hero stats
    const reposEl = document.getElementById('stat-repos');
    const followersEl = document.getElementById('stat-followers');
    const yearsEl = document.getElementById('stat-years');

    if (reposEl) animateNumber(reposEl, user.public_repos);
    if (followersEl) animateNumber(followersEl, user.followers);
    if (yearsEl) {
      const years = new Date().getFullYear() - new Date(user.created_at).getFullYear();
      animateNumber(yearsEl, years, '+');
    }

    // GitHub profile card
    const profileEl = document.getElementById('github-profile');
    if (profileEl) {
      profileEl.innerHTML = `
        <div class="gh-card">
          <img src="${user.avatar_url}" alt="${user.name || user.login}" class="gh-avatar" width="80" height="80">
          <div class="gh-info">
            <h3 class="gh-name">${user.name || user.login}</h3>
            <p class="gh-bio">${user.bio || 'Software Engineer'}</p>
            ${user.location ? `<span class="gh-meta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ${user.location}</span>` : ''}
            ${user.company ? `<span class="gh-meta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> ${user.company}</span>` : ''}
          </div>
          <div class="gh-stats-row">
            <div class="gh-stat"><strong>${user.public_repos}</strong><span>Repos</span></div>
            <div class="gh-stat"><strong>${user.followers}</strong><span>Followers</span></div>
            <div class="gh-stat"><strong>${user.following}</strong><span>Following</span></div>
            <div class="gh-stat"><strong>${user.public_gists}</strong><span>Gists</span></div>
          </div>
        </div>
      `;
    }
  } catch (e) {
    console.warn('Could not fetch GitHub profile:', e);
    document.getElementById('stat-repos').textContent = '50+';
    document.getElementById('stat-followers').textContent = '--';
    document.getElementById('stat-years').textContent = '10+';
  }
}

// ── Animate number counting up ──
function animateNumber(el, target, suffix = '') {
  const duration = 1500;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ── Fetch repos & render project cards ──
async function fetchGitHubRepos() {
  const grid = document.getElementById('projects-grid');
  const filtersEl = document.getElementById('project-filters');

  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100&type=owner`
    );
    if (!res.ok) throw new Error('GitHub API error');
    const repos = await res.json();

    // Filter out the github.io repo and forks, sort by stars then recent
    const filtered = repos
      .filter((r) => !r.fork && !r.name.endsWith('.github.io'))
      .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at));

    // Collect unique languages for filter
    const languages = [...new Set(filtered.map((r) => r.language).filter(Boolean))];

    // Render language filter pills
    if (filtersEl && languages.length > 1) {
      filtersEl.innerHTML = `
        <button class="filter-btn active" data-lang="all">All</button>
        ${languages.slice(0, 6).map((lang) => `<button class="filter-btn" data-lang="${lang}">${lang}</button>`).join('')}
      `;
      filtersEl.addEventListener('click', (e) => {
        if (!e.target.matches('.filter-btn')) return;
        filtersEl.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        renderRepos(filtered, e.target.dataset.lang);
      });
    }

    renderRepos(filtered, 'all');
  } catch (e) {
    console.warn('Could not fetch repos:', e);
    grid.innerHTML = `<p class="projects-error">Could not load repos. <a href="https://github.com/${GITHUB_USERNAME}" target="_blank">View on GitHub</a></p>`;
  }
}

function renderRepos(repos, langFilter) {
  const grid = document.getElementById('projects-grid');
  const display = langFilter === 'all' ? repos.slice(0, REPOS_TO_SHOW) : repos.filter((r) => r.language === langFilter).slice(0, REPOS_TO_SHOW);

  if (display.length === 0) {
    grid.innerHTML = '<p class="projects-empty">No repos found for this filter.</p>';
    return;
  }

  grid.innerHTML = display
    .map(
      (repo) => `
    <article class="project-card visible">
      <div class="project-header">
        <span class="project-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </span>
        <div class="project-links">
          ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" aria-label="Live site"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>` : ''}
          <a href="${repo.html_url}" target="_blank" rel="noopener" aria-label="GitHub">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          </a>
        </div>
      </div>
      <h3 class="project-title">${repo.name}</h3>
      <p class="project-desc">${repo.description || 'No description provided.'}</p>
      <div class="project-footer">
        <ul class="project-tags">
          ${repo.language ? `<li>${repo.language}</li>` : ''}
          ${repo.topics ? repo.topics.slice(0, 3).map((t) => `<li>${t}</li>`).join('') : ''}
        </ul>
        <div class="project-meta">
          ${repo.stargazers_count > 0 ? `<span class="meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${repo.stargazers_count}</span>` : ''}
          ${repo.forks_count > 0 ? `<span class="meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 01-2 2H8a2 2 0 01-2-2V9"/><path d="M12 12v3"/></svg> ${repo.forks_count}</span>` : ''}
          <span class="meta-item meta-updated">Updated ${timeAgo(repo.updated_at)}</span>
        </div>
      </div>
    </article>
  `
    )
    .join('');
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
  ];
  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s);
    if (count > 0) return `${count}${label} ago`;
  }
  return 'just now';
}

// ── Scroll-triggered animations ──
(function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 100);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
})();

// ── Mobile nav toggle ──
(function () {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => links.classList.remove('open'));
  });
})();

// ── Navbar background on scroll ──
(function () {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 50 ? 'rgba(10, 10, 15, 0.95)' : 'rgba(10, 10, 15, 0.85)';
  });
})();

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ── Active nav highlight on scroll ──
(function () {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
})();

// ── Init ──
fetchGitHubProfile();
fetchGitHubRepos();
