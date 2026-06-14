const fs = require("fs");
const path = require("path");

const token = process.env.GITHUB_TOKEN;
const user = process.env.GITHUB_REPOSITORY_OWNER || "MOVIBALE";
const includedRepo = {
  owner: "lumina-layer-studio",
  name: "Lumina-Layers",
};

if (!token) {
  throw new Error("GITHUB_TOKEN is required");
}

async function github(pathname) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "MOVIBALE-profile-stats",
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

function renderStatsSvg(stats, theme) {
  const isDark = theme === "dark";
  const title = isDark ? "#00F5FF" : "#7C3AED";
  const text = isDark ? "#E6EDF3" : "#1F2328";
  const muted = isDark ? "#8B949E" : "#57606A";
  const cyan = "#00F5FF";
  const pink = "#FF2E88";
  const purple = "#7C3AED";
  const ringTrack = isDark ? "#30363D" : "#EAE4FF";

  const rows = [
    ["Total Stars Earned:", formatNumber(stats.totalStars)],
    ["MOVIBALE repos:", formatNumber(stats.personalStars)],
    ["Lumina-Layers:", formatNumber(stats.includedStars)],
    ["Lumina forks:", formatNumber(stats.includedForks)],
    ["Public repos:", formatNumber(stats.publicRepos)],
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="495" height="195" viewBox="0 0 495 195" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(user)} GitHub stats including Lumina-Layers</title>
  <desc id="desc">Combined GitHub profile statistics, including organization project stars from Lumina-Layers.</desc>
  <style>
    .title { font: 700 20px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${title}; }
    .label { font: 700 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${text}; }
    .value { font: 700 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${text}; }
    .muted { font: 500 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${muted}; }
    .big { font: 800 42px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${text}; }
    .caption { font: 700 15px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${title}; }
  </style>
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${cyan}" />
      <stop offset="55%" stop-color="${purple}" />
      <stop offset="100%" stop-color="${pink}" />
    </linearGradient>
  </defs>

  <text x="18" y="34" class="title">${escapeXml(user)}'s GitHub Stats</text>
  <text x="18" y="54" class="muted">Includes organization project: lumina-layer-studio/Lumina-Layers</text>

  ${rows
    .map((row, index) => {
      const y = 84 + index * 22;
      return `<text x="44" y="${y}" class="label">${escapeXml(row[0])}</text>
  <text x="214" y="${y}" class="value" text-anchor="end">${escapeXml(row[1])}</text>
  <circle cx="25" cy="${y - 5}" r="6" stroke="url(#accent)" stroke-width="2" />`;
    })
    .join("\n  ")}

  <circle cx="365" cy="96" r="51" stroke="${ringTrack}" stroke-width="8" />
  <circle cx="365" cy="96" r="51" stroke="url(#accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="252 320" transform="rotate(-90 365 96)" />
  <text x="365" y="88" class="big" text-anchor="middle">${escapeXml(formatNumber(stats.totalStars))}</text>
  <text x="365" y="116" class="caption" text-anchor="middle">Total Stars</text>
  <text x="365" y="136" class="muted" text-anchor="middle">MOVIBALE + Lumina-Layers</text>

  <text x="474" y="174" class="muted" text-anchor="end">Updated ${escapeXml(stats.updatedAt)}</text>
</svg>
`;
}

async function main() {
  const [profile, repos, included] = await Promise.all([
    github(`/users/${user}`),
    getAllUserRepos(user),
    github(`/repos/${includedRepo.owner}/${includedRepo.name}`),
  ]);

  const ownedRepos = repos.filter((repo) => !repo.fork);
  const personalStars = ownedRepos.reduce(
    (sum, repo) => sum + repo.stargazers_count,
    0,
  );

  const stats = {
    publicRepos: profile.public_repos,
    personalStars,
    includedStars: included.stargazers_count,
    includedForks: included.forks_count,
    totalStars: personalStars + included.stargazers_count,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  const distDir = path.join(process.cwd(), "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, "profile-stats.svg"),
    renderStatsSvg(stats, "light"),
  );
  fs.writeFileSync(
    path.join(distDir, "profile-stats-dark.svg"),
    renderStatsSvg(stats, "dark"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
