'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function getInput(name, fallback = '') {
  const key = 'INPUT_' + name.replace(/ /g, '_').toUpperCase();
  return (process.env[key] ?? fallback).trim();
}

function setOutput(name, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile) fs.appendFileSync(outFile, `${name}=${String(value)}\n`, 'utf8');
}

function writeSummary(markdown) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) fs.appendFileSync(summaryFile, markdown + '\n', 'utf8');
}

function loadCommits(commitsJson) {
  if (commitsJson) {
    try {
      const parsed = JSON.parse(commitsJson);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // ignore invalid json and fall back
    }
  }
  try {
    const out = execSync('git log -n 30 --pretty=format:%s', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function parseConventionalCommits(messages) {
  const groups = { breaking: [], feat: [], fix: [], perf: [], other: [] };
  const pattern = /^(feat|fix|perf|refactor|docs|chore|ci|build)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i;

  for (const msg of messages) {
    const m = pattern.exec(msg.trim());
    if (!m) {
      groups.other.push({ scope: 'general', subject: msg.trim(), type: 'other' });
      continue;
    }
    const type = m[1].toLowerCase();
    const scope = m[2] || 'core';
    const isBreaking = Boolean(m[3]) || /BREAKING CHANGE/i.test(msg);
    const subject = m[4];
    const item = { type, scope, subject };
    if (isBreaking) groups.breaking.push(item);
    else if (type === 'feat') groups.feat.push(item);
    else if (type === 'fix') groups.fix.push(item);
    else if (type === 'perf') groups.perf.push(item);
    else groups.other.push(item);
  }
  return groups;
}

function bumpSemver(current, groups) {
  const clean = current.replace(/^v/, '');
  const parts = clean.split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  let [maj, min, pat] = parts;

  if (groups.breaking.length > 0) {
    return { nextVersion: `${maj + 1}.0.0`, releaseType: 'major' };
  }
  if (groups.feat.length > 0) {
    return { nextVersion: `${maj}.${min + 1}.0`, releaseType: 'minor' };
  }
  if (groups.fix.length > 0 || groups.perf.length > 0) {
    return { nextVersion: `${maj}.${min}.${pat + 1}`, releaseType: 'patch' };
  }
  return { nextVersion: `${maj}.${min}.${pat}`, releaseType: 'none' };
}

function renderReleaseMarkdown(nextVersion, releaseType, groups) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const lines = [`## v${nextVersion} (${dateStr}) — \`${releaseType}\` release`, ''];
  const renderSection = (title, items) => {
    if (!items.length) return;
    lines.push(`### ${title}`);
    for (const i of items) lines.push(`- **${i.scope}:** ${i.subject}`);
    lines.push('');
  };
  renderSection('Breaking Changes', groups.breaking);
  renderSection('Features', groups.feat);
  renderSection('Bug Fixes', groups.fix);
  renderSection('Performance', groups.perf);
  return lines.join('\n');
}

function runSelfTest() {
  const msgs = [
    'feat(auth): add OAuth2 PKCE flow',
    'fix(api): prevent null pointer on empty payload',
    'perf(db): index user_email column',
  ];
  const groups = parseConventionalCommits(msgs);
  const bump = bumpSemver('1.2.3', groups);
  if (bump.nextVersion !== '1.3.0' || bump.releaseType !== 'minor') {
    throw new Error(`Expected 1.3.0 minor, got ${bump.nextVersion} ${bump.releaseType}`);
  }
  console.log(`[SELF-TEST OK] semantic-release-changelog-pro computed v${bump.nextVersion} (${bump.releaseType}).`);
}

function main() {
  if (process.argv.includes('--self-test')) return runSelfTest();

  const currentVersion = getInput('current-version', '1.0.0');
  const changelogFile = getInput('changelog-file', 'CHANGELOG.md');
  const commitsJson = getInput('commits-json', '');
  const writeChangelog = getInput('write-changelog', 'false').toLowerCase() === 'true';

  const commits = loadCommits(commitsJson);
  const groups = parseConventionalCommits(commits);
  const { nextVersion, releaseType } = bumpSemver(currentVersion, groups);
  const md = renderReleaseMarkdown(nextVersion, releaseType, groups);

  if (writeChangelog && releaseType !== 'none') {
    const existing = fs.existsSync(changelogFile) ? fs.readFileSync(changelogFile, 'utf8') : '# Changelog\n\n';
    const updated = md + '\n' + existing.replace(/^# Changelog\s*/i, '');
    fs.writeFileSync(changelogFile, '# Changelog\n\n' + updated, 'utf8');
  }

  setOutput('next-version', nextVersion);
  setOutput('release-type', releaseType);
  setOutput('commit-count', commits.length);
  writeSummary(md);
}

main();
