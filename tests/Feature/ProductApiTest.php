<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Product1;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the product index and detail follow the Activity 5 response contract', function () {
    $category = Category::factory()->create();
    $products = Product::factory(11)->for($category)->create();

    $this->getJson('/api/v1/products')
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('status', 200)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.total', 11)
        ->assertJsonPath('links.next', url('/api/v1/products?page=2'))
        ->assertJsonPath('data.0.type', 'product')
        ->assertJsonPath('data.0.relationships.category.data.type', 'category')
        ->assertJsonPath('data.0.relationships.category.data.id', $category->id)
        ->assertJsonPath('data.0.relationships.category.links.self', url("/api/v1/categories/{$category->id}"))
        ->assertJsonPath('data.0.links.self', url("/api/v1/products/{$products->first()->id}"))
        ->assertJsonMissingPath('data.0.attributes.description');

    $this->getJson('/api/v1/products?page=2')
        ->assertOk()
        ->assertJsonPath('meta.current_page', 2)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $products->last()->id)
        ->assertJsonMissingPath('data.0.attributes.description');

    $this->getJson('/api/v1/products/1')
        ->assertOk()
        ->assertJsonPath('data.attributes.description', $products->first()->description);
});

test('product queries and dashboard stats use database records', function () {
    $electronics = Category::factory()->create(['name' => 'Electronics']);
    $books = Category::factory()->create(['name' => 'Books']);
    Product::factory(5)->for($electronics)->create(['price' => 10]);
    $latestProduct = Product::factory()->for($books)->create(['price' => 3]);

    $this->getJson('/api/v1/products/queries')
        ->assertOk()
        ->assertJsonStructure(['data' => [
            'select_name_price', 'with_category', 'select_id_name_order_by_price', 'limit_five',
            'price_greater_than_or_equal_3', 'electronics', 'sum_price', 'avg_price', 'max_price',
            'min_price', 'total_price_per_category', 'average_price_per_category',
            'minimum_price_per_category', 'average_price_ascending', 'electronics_and_books',
        ]])
        ->assertJsonCount(6, 'data.select_name_price')
        ->assertJsonCount(5, 'data.limit_five')
        ->assertJsonCount(5, 'data.electronics')
        ->assertJsonCount(2, 'data.electronics_and_books')
        ->assertJsonPath('data.sum_price', 53)
        ->assertJsonPath('data.average_price_ascending.0.category', 'Books');

    $this->getJson('/api/v1/products/stats')
        ->assertOk()
        ->assertJsonPath('data.total_products', 6)
        ->assertJsonPath('data.total_units_in_stock', 0)
        ->assertJsonPath('data.inventory_value', 0)
        ->assertJsonPath('data.low_stock_count', 0)
        ->assertJsonCount(5, 'data.recent_products')
        ->assertJsonPath('data.recent_products.0.id', $latestProduct->id);

    Product1::factory()->create(['price' => 12.5, 'quantity' => 5]);
    Product1::factory()->create(['price' => 7, 'quantity' => 6]);
    Product1::factory()->create(['price' => 100, 'quantity' => 0]);

    $this->getJson('/api/v1/products/stats')
        ->assertOk()
        ->assertJsonPath('data.total_products', 6)
        ->assertJsonPath('data.total_units_in_stock', 11)
        ->assertJsonPath('data.inventory_value', 104.5)
        ->assertJsonPath('data.low_stock_count', 2);

    $this->getJson('/api/v1/products/stats?dashboard=1')
        ->assertOk()
        ->assertJsonCount(6, 'data.products')
        ->assertJsonPath('data.products.5.id', $latestProduct->id)
        ->assertJsonPath('data.products.5.category.name', 'Books')
        ->assertJsonMissingPath('data.products.5.description');

    $this->get('/dashboard')
        ->assertOk()
        ->assertSee('data-stats-url="/api/v1/products/stats"', false)
        ->assertSee('Category Landscape')
        ->assertSee('All Products');
});

test('the versioned product resource supports validated writes', function () {
    $category = Category::factory()->create();

    $this->postJson('/api/v1/products', ['name' => 'Incomplete'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category_id', 'price']);

    $created = $this->postJson('/api/v1/products', [
        'category_id' => $category->id,
        'name' => 'Notebook',
        'price' => 14.25,
    ])->assertCreated();

    $url = '/api/v1/products/'.$created->json('data.id');

    $this->patchJson($url, ['description' => 'Ruled pages'])
        ->assertOk()
        ->assertJsonPath('data.attributes.name', 'Notebook')
        ->assertJsonPath('data.attributes.description', 'Ruled pages');

    $this->deleteJson($url)->assertOk();
    $this->getJson($url)->assertNotFound();
});
