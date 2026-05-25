'use strict';

const fs = require('fs');
const path = require('path');

const HERMES_DIR = 'source/books/hermes';

function getHermesNav(baseDir) {
  const booksDir = path.join(baseDir, HERMES_DIR);
  if (!fs.existsSync(booksDir)) return {};

  const files = fs.readdirSync(booksDir)
    .filter(f => f.endsWith('.md') && f !== 'index.md')
    .sort();

  const navMap = {};

  for (let i = 0; i < files.length; i++) {
    const slug = files[i].replace(/\.md$/, '');
    const content = fs.readFileSync(path.join(booksDir, files[i]), 'utf8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let title = slug;

    if (fmMatch) {
      const titleMatch = fmMatch[1].match(/^title:\s*(.+)/m);
      if (titleMatch) title = titleMatch[1].trim();
    }

    const prevSlug = i > 0 ? files[i - 1].replace(/\.md$/, '') : null;
    const nextSlug = i < files.length - 1 ? files[i + 1].replace(/\.md$/, '') : null;

    navMap[slug] = {
      title,
      prev: prevSlug,
      next: nextSlug,
      prev_title: prevSlug ? navMap[prevSlug] ? navMap[prevSlug].title : null : null,
      next_title: null,
    };
  }

  // Second pass for titles (navMap built incrementally above was wrong for prev_title)
  for (let i = 0; i < files.length; i++) {
    const slug = files[i].replace(/\.md$/, '');
    const prevSlug = i > 0 ? files[i - 1].replace(/\.md$/, '') : null;
    const nextSlug = i < files.length - 1 ? files[i + 1].replace(/\.md$/, '') : null;
    navMap[slug].prev_title = prevSlug ? navMap[prevSlug].title : null;
    navMap[slug].next_title = nextSlug ? navMap[nextSlug].title : null;
  }

  return navMap;
}

function applyBookNav(data, navMap) {
  if (!data.source || data.source.indexOf(HERMES_DIR) === -1) return data;
  if (data.source.endsWith('index.md')) return data;

  const slug = path.basename(data.source, '.md');
  const nav = navMap[slug];
  if (!nav) return data;

  if (!data.prev && nav.prev) data.prev = nav.prev;
  if (!data.next && nav.next) data.next = nav.next;
  if (!data.prev_title && nav.prev_title) data.prev_title = nav.prev_title;
  if (!data.next_title && nav.next_title) data.next_title = nav.next_title;
  data.book_chapter = true;

  return data;
}

hexo.extend.filter.register('before_page_render', function(data) {
  return applyBookNav(data, getHermesNav(hexo.base_dir));
});

hexo.extend.filter.register('before_post_render', function(data) {
  return applyBookNav(data, getHermesNav(hexo.base_dir));
});
