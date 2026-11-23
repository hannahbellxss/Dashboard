<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Product Dashboard</title>
    <link rel="stylesheet" href="{{ asset('product-dashboard.css') }}">
    <script src="{{ asset('product-dashboard.js') }}" defer></script>
</head>
<body>
    <header class="dashboard-header">
        <div class="header-content">
            <h1>Product Dashboard</h1>
            <div class="header-actions">
                <span id="updated-at"></span>
                <button id="refresh" type="button">Refresh</button>
            </div>
        </div>
    </header>

    <main class="container" data-stats-url="{{ route('products.stats', absolute: false) }}">
        <p id="dashboard-status" role="status">Loading products…</p>
        <div id="dashboard-data" hidden>
            <dl class="stats" aria-label="Product summary">
                <div class="card"><dt>Total Products</dt><dd id="total-products"></dd></div>
                <div class="card"><dt>Total Price</dt><dd id="total-price"></dd></div>
                <div class="card"><dt>Avg. Price</dt><dd id="average-price"></dd></div>
                <div class="card"><dt>Categories</dt><dd id="category-count"></dd></div>
                <div class="card"><dt>Highest Price</dt><dd id="highest-price"></dd><dd class="detail" id="highest-name"></dd></div>
                <div class="card"><dt>Lowest Price</dt><dd id="lowest-price"></dd><dd class="detail" id="lowest-name"></dd></div>
            </dl>

            <div class="chart-grid">
                @foreach ([
                    ['category-totals', 'Total Price per Category', 'All categories', 'wide overview'],
                    ['category-share', 'Category Share', 'By product count', 'overview'],
                    ['category-averages', 'Avg Price per Category', '', ''],
                    ['expensive-products', 'Top 5 Expensive Products', '', ''],
                    ['cheap-products', 'Top 5 Cheapest Products', '', ''],
                    ['ordered-prices', 'Products Ordered by Price', 'Sampled prices', 'wide'],
                    ['category-ranges', 'Price Range per Category', 'Min → Avg', ''],
                    ['category-landscape', 'Category Landscape', 'Avg vs total price', 'wide'],
                    ['electronics-share', 'Electronics Share', 'Of all products', ''],
                    ['first-products', 'First 5 Products', '', ''],
                    ['pricing-insights', 'Pricing Insights', '', 'wide'],
                ] as [$id, $title, $subtitle, $classes])
                    <section class="panel {{ $classes }}" aria-labelledby="{{ $id }}-title">
                        <header class="panel-title">
                            <h2 id="{{ $id }}-title">{{ $title }}</h2>
                            <span>{{ $subtitle }}</span>
                        </header>
                        <div id="{{ $id }}"></div>
                    </section>
                @endforeach

                <section class="panel full" aria-labelledby="all-products-title">
                    <header class="panel-title">
                        <h2 id="all-products-title">All Products</h2>
                        <span>Paginated results</span>
                    </header>
                    <div class="table-toolbar">
                        <input id="product-search" type="search" placeholder="Search product or category…" aria-label="Search product or category">
                        <span class="scroll-hint">Drag to scroll</span>
                        <span id="product-count" aria-live="polite"></span>
                    </div>
                    <div id="table-scroll" class="table-scroll" tabindex="0" role="region" aria-label="Scrollable product results">
                        <table aria-labelledby="all-products-title">
                            <thead><tr>
                                <th scope="col">#</th>
                                <th scope="col">Product</th>
                                <th scope="col">Category</th>
                                <th scope="col" id="price-heading" aria-sort="ascending"><button id="sort-price" type="button">Price ↑</button></th>
                                <th scope="col">Created</th>
                            </tr></thead>
                            <tbody id="product-rows"></tbody>
                        </table>
                        <p id="empty-products" hidden>No matching products.</p>
                    </div>
                    <nav class="pagination" aria-label="Product pages">
                        <button id="previous-page" type="button">‹ Prev</button>
                        <span id="page-label" aria-live="polite"></span>
                        <button id="next-page" type="button">Next ›</button>
                    </nav>
                </section>
            </div>
        </div>
    </main>
</body>
</html>
