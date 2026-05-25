'use strict';

function transformMermaidBlocks(content) {
  if (!content) return content;

  return content.replace(
    /(?:^|\n)(```mermaid)\s*\n([\s\S]*?)\n```/g,
    function(match, open, diagram) {
      var clean = diagram.replace(/\n+$/, '');
      return '\n<pre class="mermaid">\n' + clean + '\n</pre>\n';
    }
  );
}

hexo.extend.filter.register('before_post_render', function(data) {
  data.content = transformMermaidBlocks(data.content);
  return data;
}, 9);

hexo.extend.filter.register('after_post_render', function(data) {
  if (!data.content || data.content.indexOf('class="mermaid"') !== -1) {
    return data;
  }

  data.content = data.content.replace(
    /<figure class="highlight[^"]*">[\s\S]*?<pre><code>([\s\S]*?)<\/code><\/pre>[\s\S]*?<\/figure>/g,
    function(match, code) {
      var text = code
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();

      var mermaidTypes = /^(graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie\s|gitGraph|journey|mindmap|timeline|quadrantChart|xychart|block-beta)/m;
      if (!mermaidTypes.test(text)) return match;

      return '<pre class="mermaid">\n' + text + '\n</pre>';
    }
  );

  return data;
}, 9);
