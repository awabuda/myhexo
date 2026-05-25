{% if page.prev or page.next %}
<div class="post-nav book-nav">
  {% if page.prev %}
    <div class="post-nav-prev post-nav-item">
      <a href="/books/hermes/{{ page.prev }}/" rel="prev" title="{{ page.prev_title or page.prev }}">
        <span class="post-nav-direction">{{ __('book.prev') }}</span>
        <span class="post-nav-title">{{ page.prev_title or page.prev }}</span>
        <i class="fa fa-chevron-left"></i>
      </a>
    </div>
  {% else %}
    <div class="post-nav-prev post-nav-item post-nav-empty"></div>
  {% endif %}

  {% if page.next %}
    <div class="post-nav-next post-nav-item">
      <a href="/books/hermes/{{ page.next }}/" rel="next" title="{{ page.next_title or page.next }}">
        <span class="post-nav-direction">{{ __('book.next') }}</span>
        <span class="post-nav-title">{{ page.next_title or page.next }}</span>
        <i class="fa fa-chevron-right"></i>
      </a>
    </div>
  {% else %}
    <div class="post-nav-next post-nav-item post-nav-empty"></div>
  {% endif %}
</div>
{% endif %}
