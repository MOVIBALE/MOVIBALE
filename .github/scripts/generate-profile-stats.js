const fs = require("fs");
const path = require("path");

const token = process.env.GITHUB_TOKEN;
const user = process.env.GITHUB_REPOSITORY_OWNER || "MOVIBALE";

const featuredRepos = [
  {
    owner: "lumina-layer-studio",
    name: "Lumina-Layers",
    output: "project-lumina.svg",
    width: 860,
    height: 180,
    eyebrow: "FLAGSHIP PROJECT",
    displayName: "lumina-layer-studio/Lumina-Layers",
  },
  {
    owner: "MOVIBALE",
    name: "Batch-image-to-video-conversion",
    output: "project-batch-video.svg",
    width: 420,
    height: 152,
    eyebrow: "PYTHON TOOL",
    displayName: "Batch image-to-video",
  },
  {
    owner: "MOVIBALE",
    name: "Batch-cutout",
    output: "project-batch-cutout.svg",
    width: 420,
    height: 152,
    eyebrow: "PYTHON TOOL",
    displayName: "Batch-cutout",
  },
];

if (!token) {
  throw new Error("GITHUB_TOKEN is required");
}

async function github(pathname) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "MOVIBALE-profile-assets",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${pathname} failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function getAllUserRepos(username) {
  const repos = [];
  let page = 1;

  while (true) {
    const batch = await github(
      `/users/${username}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
    );
    repos.push(...batch);

    if (batch.length < 100) {
      return repos;
    }

    page += 1;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function truncate(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function wrapWords(value, maxChars, maxLines) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[lines.length - 1] = truncate(lines[lines.length - 1], maxChars);
  }

  return lines;
}

function languageColor(language) {
  const colors = {
    Python: "#3776AB",
    "C++": "#F34B7D",
    JavaScript: "#F1E05A",
    TypeScript: "#3178C6",
    HTML: "#E34C26",
    CSS: "#563D7C",
    Shell: "#89E051",
    Dockerfile: "#384D54",
    Jupyter: "#DA5B0B",
  };

  return colors[language] || "#8B949E";
}

function svgBase(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00F5FF" />
      <stop offset="52%" stop-color="#7C3AED" />
      <stop offset="100%" stop-color="#FF2E88" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="9" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <style>
    .card { fill: #0D1117; stroke: url(#accent); stroke-width: 1.2; }
    .eyebrow { font: 700 11px 'Segoe UI', Ubuntu, Sans-Serif; letter-spacing: .08em; fill: #00F5FF; }
    .title { font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: #F0F6FC; }
    .smallTitle { font: 800 21px 'Segoe UI', Ubuntu, Sans-Serif; fill: #F0F6FC; }
    .text { font: 500 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #C9D1D9; }
    .muted { font: 500 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #8B949E; }
    .label { font: 700 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: #C9D1D9; }
    .value { font: 800 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: #F0F6FC; }
    .big { font: 900 45px 'Segoe UI', Ubuntu, Sans-Serif; fill: #F0F6FC; }
    .chipText { font: 700 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #F0F6FC; }
  </style>
${body}
</svg>
`;
}

function renderProjectCard(repo, config) {
  const width = config.width;
  const height = config.height;
  const isWide = width > 500;
  const titleClass = isWide ? "title" : "smallTitle";
  const description = repo.description || "No description provided";
  const maxChars = isWide ? 86 : 45;
  const lines = wrapWords(description, maxChars, isWide ? 2 : 2);
  const statY = height - 31;
  const titleY = isWide ? 66 : 58;
  const descY = isWide ? 95 : 86;
  const title = isWide
    ? config.displayName
    : truncate(config.displayName, 30);

  const descriptionText = lines
    .map(
      (line, index) =>
        `<text x="28" y="${descY + index * 19}" class="text">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  const body = `
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="18" class="card" />
  <circle cx="${width - 62}" cy="38" r="36" fill="url(#accent)" opacity=".18" filter="url(#softGlow)" />
  <text x="28" y="32" class="eyebrow">${escapeXml(config.eyebrow)}</text>
  <text x="28" y="${titleY}" class="${titleClass}">${escapeXml(title)}</text>
  ${descriptionText}
  <circle cx="32" cy="${statY - 5}" r="6" fill="${languageColor(repo.language)}" />
  <text x="48" y="${statY}" class="chipText">${escapeXml(repo.language || "Code")}</text>
  <text x="${isWide ? 156 : 154}" y="${statY}" class="chipText">Stars ${escapeXml(formatNumber(repo.stargazers_count))}</text>
  <text x="${isWide ? 250 : 232}" y="${statY}" class="chipText">Forks ${escapeXml(formatNumber(repo.forks_count))}</text>
  <text x="${isWide ? width - 30 : width - 24}" y="${statY}" class="muted" text-anchor="end">${escapeXml(repo.owner.login)}</text>`;

  return svgBase(width, height, body);
}

function renderStatsSvg(stats) {
  const rows = [
    ["Total stars", stats.totalStars],
    ["MOVIBALE repos", stats.personalStars],
    ["Lumina stars", stats.includedStars],
    ["Lumina forks", stats.includedForks],
    ["Public repos", stats.publicRepos],
  ];

  const rowMarkup = rows
    .map((row, index) => {
      const y = 75 + index * 21;
      return `<text x="28" y="${y}" class="label">${escapeXml(row[0])}</text>
  <text x="205" y="${y}" class="value" text-anchor="end">${escapeXml(formatNumber(row[1]))}</text>
  <circle cx="15" cy="${y - 5}" r="5" stroke="url(#accent)" stroke-width="2" />`;
    })
    .join("\n  ");

  const body = `
  <rect x="1" y="1" width="418" height="178" rx="18" class="card" />
  <text x="28" y="33" class="smallTitle">MOVIBALE Stats</text>
  <text x="28" y="53" class="muted">Including Lumina-Layers</text>
  ${rowMarkup}
  <circle cx="319" cy="88" r="45" stroke="#30363D" stroke-width="8" />
  <circle cx="319" cy="88" r="45" stroke="url(#accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="235 283" transform="rotate(-90 319 88)" />
  <text x="319" y="82" class="big" text-anchor="middle">${escapeXml(formatNumber(stats.totalStars))}</text>
  <text x="319" y="112" class="eyebrow" text-anchor="middle">TOTAL STARS</text>
  <text x="319" y="139" class="muted" text-anchor="middle">Updated ${escapeXml(stats.updatedAt)}</text>`;

  return svgBase(420, 180, body);
}

function renderLanguagesSvg(languageTotals, updatedAt) {
  const entries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  const barX = 28;
  const barY = 76;
  const barWidth = 804;
  let offset = 0;

  const segments = entries
    .map(([language, bytes]) => {
      const width = total ? Math.max((bytes / total) * barWidth, 2) : 0;
      const segment = `<rect x="${barX + offset}" y="${barY}" width="${width}" height="14" rx="7" fill="${languageColor(language)}" />`;
      offset += width;
      return segment;
    })
    .join("\n  ");

  const labels = entries.length
    ? entries
        .map(([language, bytes], index) => {
          const percent = total ? ((bytes / total) * 100).toFixed(1) : "0.0";
          const x = 28 + (index % 3) * 265;
          const y = 122 + Math.floor(index / 3) * 28;
          return `<circle cx="${x}" cy="${y - 5}" r="6" fill="${languageColor(language)}" />
  <text x="${x + 18}" y="${y}" class="chipText">${escapeXml(language)} ${percent}%</text>`;
        })
        .join("\n  ")
    : `<text x="28" y="122" class="chipText">No language data</text>`;

  const body = `
  <rect x="1" y="1" width="858" height="158" rx="18" class="card" />
  <text x="28" y="38" class="title">Most Used Languages</text>
  <text x="832" y="38" class="muted" text-anchor="end">Updated ${escapeXml(updatedAt)}</text>
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="14" rx="7" fill="#30363D" />
  ${segments}
  ${labels}`;

  return svgBase(860, 160, body);
}

async function collectLanguageTotals(repos) {
  const totals = {};

  for (const repo of repos) {
    const languages = await github(`/repos/${repo.owner.login}/${repo.name}/languages`);
    for (const [language, bytes] of Object.entries(languages)) {
      totals[language] = (totals[language] || 0) + bytes;
    }
  }

  return totals;
}

async function main() {
  const [profile, repos, ...featuredData] = await Promise.all([
    github(`/users/${user}`),
    getAllUserRepos(user),
    ...featuredRepos.map((repo) => github(`/repos/${repo.owner}/${repo.name}`)),
  ]);

  const ownedRepos = repos.filter((repo) => !repo.fork);
  const luminaRepo = featuredData[0];
  const personalStars = ownedRepos.reduce(
    (sum, repo) => sum + repo.stargazers_count,
    0,
  );
  const languageRepos = [
    ...ownedRepos,
    luminaRepo,
  ];

  const stats = {
    publicRepos: profile.public_repos,
    personalStars,
    includedStars: luminaRepo.stargazers_count,
    includedForks: luminaRepo.forks_count,
    totalStars: personalStars + luminaRepo.stargazers_count,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  const distDir = path.join(process.cwd(), "dist");
  fs.mkdirSync(distDir, { recursive: true });

  for (const [index, config] of featuredRepos.entries()) {
    fs.writeFileSync(
      path.join(distDir, config.output),
      renderProjectCard(featuredData[index], config),
    );
  }

  fs.writeFileSync(path.join(distDir, "profile-stats.svg"), renderStatsSvg(stats));
  fs.writeFileSync(
    path.join(distDir, "profile-languages.svg"),
    renderLanguagesSvg(await collectLanguageTotals(languageRepos), stats.updatedAt),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
