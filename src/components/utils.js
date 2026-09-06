export const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export const tags = values => `<div class="tags">${values.map(value => `<span>${escape(value)}</span>`).join('')}</div>`;
export const facts = (values, className) => `<div class="${className}">${values.map(fact => `<div><strong>${escape(fact.value)}</strong><span>${escape(fact.label)}</span></div>`).join('')}</div>`;
