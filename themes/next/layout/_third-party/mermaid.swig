{% if theme.mermaid.enable and theme.mermaid.cdn %}
  <script src="{{ theme.mermaid.cdn }}"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof mermaid === 'undefined') return;
      mermaid.initialize({
        theme: '{{ theme.mermaid.theme | default("default") }}',
        startOnLoad: true,
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { useMaxWidth: true, htmlLabels: true }
      });
      mermaid.run({ querySelector: '.mermaid' });
    });
  </script>
{% endif %}
