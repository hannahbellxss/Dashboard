const byId = (id) => document.getElementById(id);
const dashboard = document.querySelector('[data-stats-url]');
const status = byId('dashboard-status');
const refresh = byId('refresh');
const search = byId('product-search');
const tableScroll = byId('table-scroll');
const pageSize = 15;
const colors = ['#6563f2', '#00b5d1', '#0bb981', '#f59d0a', '#f04448', '#8b5cf6', '#ee4196', '#84cc16'];
const categoryColors = new Map([
    ['Electronics', colors[0]], ['Books', colors[1]], ['Shoes', colors[2]],
    ['Clothing', colors[3]], ['Home & Kitchen', colors[4]], ['Sports & Outdoors', colors[5]],
    ['Beauty & Personal Care', colors[6]], ['Toys & Games', colors[7]],
]);
const count = new Intl.NumberFormat('en-PH');
const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const percent = new Intl.NumberFormat('en-PH', { style: 'percent', maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
const time = new Intl.DateTimeFormat('en-PH', { timeStyle: 'short' });
const money = (value) => value == null ? '—' : currency.format(value);
let products = [];
let ordered = [];
let page = 1;
let ascending = true;
let plots = [];

function element(tag, className = '', label) {
    const node = document.createElement(tag);
    node.className = className;
    if (label !== undefined) {
        node.textContent = label;
    }
    return node;
}

function colored(node, color) {
    node.style.setProperty('--series', color);
    return node;
}

function withTitle(label) {
    const node = element('span', 'truncate', label);
    node.title = label;
    return node;
}

function groupByCategory(items) {
    const categories = new Map();
    for (const product of items) {
        if (!categories.has(product.category)) {
            categories.set(product.category, {
                name: product.category, color: product.color, total: 0, count: 0, min: Infinity,
            });
        }
        const category = categories.get(product.category);
        category.total += product.price;
        category.count += 1;
        category.min = Math.min(category.min, product.price);
    }
    return Array.from(categories.values(), (category) => ({
        ...category, average: category.total / category.count,
    }));
}

function renderTotals(categories) {
    const columns = element('div', 'columns');
    const max = Math.max(1, ...categories.map(({ total }) => total));
    for (const category of categories) {
        const column = element('div', 'column');
        const plot = element('div', 'column-plot');
        const bar = colored(element('div', 'column-bar'), category.color);
        bar.style.height = (category.total / max * 112) + 'px';
        plot.append(element('span', '', money(category.total)), bar);
        column.append(plot, withTitle(category.name));
        columns.append(column);
    }
    byId('category-totals').replaceChildren(columns);
}

function renderShare(categories) {
    const donut = element('div', 'donut');
    const label = element('div', 'donut-label');
    label.append(element('strong', '', count.format(products.length)), element('small', '', 'Products'));
    donut.append(label);

    const legend = element('div', 'legend');
    let offset = 0;
    const stops = categories.map((category) => {
        const share = category.count / products.length;
        const row = element('div', 'legend-row');
        row.append(colored(element('span', 'swatch'), category.color), withTitle(category.name),
            element('span', '', count.format(category.count)), element('span', '', percent.format(share)));
        legend.append(row);
        const start = offset;
        offset += share * 100;
        return category.color + ' ' + start + '% ' + offset + '%';
    });
    if (stops.length) {
        donut.style.background = 'conic-gradient(' + stops.join(',') + ')';
        legend.tabIndex = 0;
        legend.setAttribute('aria-label', 'Category counts and percentages');
    }
    byId('category-share').replaceChildren(donut, legend);
}

function renderMetrics(id, items, dots = false) {
    const max = Math.max(.01, ...items.map(({ value }) => value));
    const rows = items.map(({ name, value, color }) => {
        const row = element('div', 'metric-row');
        const meter = colored(element('span', dots ? 'meter dot-track' : 'meter'), color);
        const fill = element('i');
        const width = value / max * 100 + '%';
        fill.style.width = width;
        meter.style.setProperty('--width', width);
        meter.append(fill);
        row.append(withTitle(name), meter, element('strong', '', money(value)));
        return row;
    });
    byId(id).replaceChildren(...rows);
}

function renderRanges(categories) {
    const max = Math.max(.01, ...categories.map(({ average }) => average));
    const rows = categories.map((category) => {
        const row = element('div', 'range-row');
        const label = element('div');
        label.append(withTitle(category.name), element('small', '', money(category.min) + ' – ' + money(category.average)));
        label.className = 'truncate';
        const track = colored(element('span', 'range-track'), category.color);
        const range = element('i');
        range.style.left = category.min / max * 100 + '%';
        range.style.width = (category.average - category.min) / max * 100 + '%';
        track.append(range);
        row.append(label, track);
        return row;
    });
    byId('category-ranges').replaceChildren(...rows);
}

function createPlot(height, label, draw) {
    const canvas = element('canvas');
    canvas.style.height = height + 'px';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    plots.push(() => {
        const width = canvas.clientWidth;
        if (!width) {
            return;
        }
        const scale = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const context = canvas.getContext('2d');
        context.scale(scale, scale);
        draw(context, width, height);
    });
    return canvas;
}

function caption(...labels) {
    const node = element('div', 'chart-caption');
    node.append(...labels.map((label) => element('span', '', label)));
    return node;
}

function renderPriceCurve() {
    const size = Math.min(100, ordered.length);
    const sample = Array.from({ length: size }, (_, index) =>
        ordered[Math.round(index * (ordered.length - 1) / Math.max(1, size - 1))].price);
    const low = sample.at(0);
    const high = sample.at(-1);
    const canvas = createPlot(132, 'Sampled products ordered by ascending price', (context, width, height) => {
        if (!size) {
            return;
        }
        const bottom = height - 8;
        context.beginPath();
        sample.forEach((price, index) => {
            const x = 8 + index / Math.max(1, size - 1) * (width - 16);
            const y = bottom - (price - low) / (high - low || 1) * (height - 16);
            context.lineTo(x, y);
        });
        context.strokeStyle = colors[0];
        context.lineWidth = 1.6;
        context.stroke();
        context.lineTo(size === 1 ? 10 : width - 8, bottom);
        context.lineTo(8, bottom);
        const fill = context.createLinearGradient(0, 0, 0, bottom);
        fill.addColorStop(0, '#6563f240');
        fill.addColorStop(1, '#6563f202');
        context.fillStyle = fill;
        context.fill();
    });
    byId('ordered-prices').replaceChildren(canvas,
        caption('Lowest ' + money(low), count.format(size) + ' sampled products', 'Highest ' + money(high)));
}

function renderLandscape(categories) {
    const maxAverage = Math.max(.01, ...categories.map(({ average }) => average));
    const maxTotal = Math.max(.01, ...categories.map(({ total }) => total));
    const maxCount = Math.max(1, ...categories.map(({ count }) => count));
    const chartHeight = Math.max(234, 56 + Math.ceil(categories.length / 2) * 17);
    const description = 'Category bubble chart. Horizontal position shows average price, vertical position shows total price, and bubble size shows product count. ';
    const categoryNames = categories.map(({ name }) => name).join(', ');
    const canvas = createPlot(chartHeight, description + categoryNames, (context, width, height) => {
        const labelWidth = Math.min(120, width * .25);
        const left = labelWidth + 32;
        const right = Math.max(left, width - left);
        const top = 30;
        const bottom = height - 32;
        const points = categories.map((category) => ({
            ...category,
            x: left + category.average / maxAverage * (right - left),
            y: bottom - category.total / maxTotal * (bottom - top),
        }));

        context.strokeStyle = '#e9d9d1';
        context.beginPath();
        context.moveTo(left, top);
        context.lineTo(left, bottom);
        context.lineTo(right, bottom);
        context.stroke();

        for (const point of points) {
            const radius = 7 + Math.sqrt(point.count / maxCount) * 19;
            context.beginPath();
            context.arc(point.x, point.y, radius, 0, Math.PI * 2);
            context.fillStyle = point.color + 'bc';
            context.fill();
        }

        points.sort((a, b) => a.x - b.x);
        const split = Math.ceil(points.length / 2);
        const sides = [points.slice(0, split), points.slice(split)];
        context.font = '11px system-ui';
        context.textBaseline = 'middle';

        sides.forEach((side, index) => {
            const isLeft = index === 0;
            const textX = isLeft ? 4 : width - 4;
            const lineEnd = isLeft ? labelWidth + 4 : width - labelWidth - 4;
            context.textAlign = isLeft ? 'left' : 'right';
            side.sort((a, b) => a.y - b.y).forEach((point, row) => {
                const labelY = 22 + (row + .5) * (height - 44) / side.length;
                context.beginPath();
                context.moveTo(point.x, point.y);
                context.lineTo(lineEnd, labelY);
                context.strokeStyle = point.color;
                context.stroke();
                context.fillStyle = '#000';
                context.fillText(point.name, textX, labelY, labelWidth - 5);
            });
        });
    });
    byId('category-landscape').replaceChildren(canvas, caption('← lower avg price', 'higher avg price →'));
}

function renderElectronics(categories) {
    const electronics = categories.find(({ name }) => name.toLowerCase() === 'electronics');
    const amount = electronics?.count ?? 0;
    const share = products.length ? amount / products.length : 0;
    const gauge = element('div', 'gauge');
    const canvas = createPlot(94, 'Electronics share ' + percent.format(share), (context, width) => {
        const radius = Math.min(width / 2 - 9, 67);
        if (radius <= 0) {
            return;
        }
        const drawArc = (color, end) => {
            context.beginPath();
            context.arc(width / 2, 82, radius, Math.PI, end);
            context.lineCap = 'round';
            context.lineWidth = 14;
            context.strokeStyle = color;
            context.stroke();
        };
        drawArc('#efe5e0', Math.PI * 2);
        if (share) {
            drawArc(colors[0], Math.PI * (1 + share));
        }
    });
    const label = element('div', 'gauge-label');
    label.append(element('strong', '', percent.format(share)), element('small', '', 'Electronics'));
    gauge.append(canvas, label, element('div', 'gauge-caption', count.format(amount) + ' of ' + count.format(products.length) + ' products'));
    byId('electronics-share').replaceChildren(gauge);
}

function renderDashboard() {
    plots = [];
    const categories = groupByCategory(products);
    const byTotal = [...categories].sort((a, b) => b.total - a.total);
    const byAverage = [...categories].sort((a, b) => b.average - a.average);
    const total = products.reduce((sum, product) => sum + product.price, 0);
    const highest = ordered.at(-1);
    const lowest = ordered.at(0);
    const stats = {
        'total-products': count.format(products.length), 'total-price': money(total),
        'average-price': money(products.length ? total / products.length : null),
        'category-count': count.format(categories.length), 'highest-price': money(highest?.price),
        'lowest-price': money(lowest?.price), 'highest-name': highest?.name ?? '',
        'lowest-name': lowest?.name ?? '',
    };
    for (const [id, value] of Object.entries(stats)) {
        byId(id).textContent = value;
    }

    const priceItems = (items) => items.map((product) => ({ ...product, value: product.price }));
    renderTotals(byTotal);
    renderShare(categories);
    renderMetrics('category-averages', byAverage.map((category) => ({ ...category, value: category.average })), true);
    renderMetrics('expensive-products', priceItems(ordered.slice(-5).reverse()));
    renderMetrics('cheap-products', priceItems(ordered.slice(0, 5)));
    renderPriceCurve();
    renderRanges(byAverage);
    renderLandscape(byAverage);
    renderElectronics(categories);
    renderMetrics('first-products', priceItems(products.slice(0, 5)));
    const describe = (product) => product ? product.name + ' — ' + money(product.price) : '—';
    const insights = [
        ['Most expensive', describe(highest)],
        ['Cheapest', describe(lowest)],
        ['Price range', lowest ? money(lowest.price) + ' – ' + money(highest.price) : '—'],
    ];
    byId('pricing-insights').replaceChildren(...insights.map(([name, value]) => {
        const row = element('div', 'insight-row');
        row.append(element('span', '', name), element('strong', '', value));
        return row;
    }));
}

function renderTable() {
    const query = search.value.trim().toLowerCase();
    const sorted = ascending ? ordered : [...ordered].reverse();
    const matches = sorted.filter(({ name, category }) =>
        name.toLowerCase().includes(query) || category.toLowerCase().includes(query));
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.max(1, Math.min(page, pages));
    const start = (page - 1) * pageSize;
    const rows = matches.slice(start, start + pageSize).map((product, index) => {
        const row = element('tr');
        row.insertCell().textContent = start + index + 1;
        row.insertCell().textContent = product.name;
        row.insertCell().append(colored(element('span', 'badge', product.category), product.color));
        row.insertCell().textContent = money(product.price);
        row.insertCell().textContent = product.created_at ? date.format(new Date(product.created_at)) : '—';
        return row;
    });
    byId('product-rows').replaceChildren(...rows);
    byId('empty-products').hidden = matches.length > 0;
    byId('product-count').textContent = count.format(matches.length) + (matches.length === 1 ? ' product' : ' products');
    byId('page-label').textContent = 'Page ' + page + ' of ' + pages;
    byId('previous-page').disabled = page === 1;
    byId('next-page').disabled = page === pages;
    byId('price-heading').setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
    byId('sort-price').textContent = ascending ? 'Price ↑' : 'Price ↓';
    tableScroll.scrollTop = 0;
}

async function loadProducts() {
    refresh.disabled = true;
    status.hidden = false;
    status.textContent = 'Loading products…';
    try {
        const url = new URL(dashboard.dataset.statsUrl, location.href);
        url.searchParams.set('dashboard', '1');
        const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Product request failed');
        }
        const { data } = await response.json();
        const palette = new Map(categoryColors);
        let nextColor = 0;
        products = data.products.map((product) => {
            const category = product.category?.name ?? 'Uncategorized';
            if (!palette.has(category)) {
                palette.set(category, colors[nextColor++ % colors.length]);
            }
            return { ...product, category, price: Number(product.price), color: palette.get(category) };
        });
        ordered = [...products].sort((a, b) => a.price - b.price || a.id - b.id);
        renderDashboard();
        renderTable();
        byId('dashboard-data').hidden = false;
        status.hidden = true;
        byId('updated-at').textContent = 'Last updated ' + time.format(new Date());
        redrawPlots();
    } catch {
        status.textContent = 'Could not load products. Select Refresh to try again.';
    } finally {
        refresh.disabled = false;
    }
}

function redrawPlots() {
    plots.forEach((draw) => draw());
}

refresh.addEventListener('click', loadProducts);
window.addEventListener('resize', redrawPlots);
search.addEventListener('input', () => { page = 1; renderTable(); });
byId('sort-price').addEventListener('click', () => { ascending = !ascending; page = 1; renderTable(); });
byId('previous-page').addEventListener('click', () => { page -= 1; renderTable(); });
byId('next-page').addEventListener('click', () => { page += 1; renderTable(); });

let drag;
tableScroll.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.button !== 0 || event.target.closest('button')) {
        return;
    }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: tableScroll.scrollLeft, top: tableScroll.scrollTop };
});
tableScroll.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId || !(event.buttons & 1)) {
        return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 5 && !tableScroll.hasPointerCapture(event.pointerId)) {
        return;
    }
    tableScroll.setPointerCapture(event.pointerId);
    tableScroll.classList.add('dragging');
    tableScroll.scrollLeft = drag.left - dx;
    tableScroll.scrollTop = drag.top - dy;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    window.addEventListener(event, () => {
        drag = undefined;
        tableScroll.classList.remove('dragging');
    });
}

loadProducts();
