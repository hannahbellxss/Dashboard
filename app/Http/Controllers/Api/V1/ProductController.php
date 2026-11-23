<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProductResource;
use App\Models\Product;
use App\Models\Product1;
use App\Traits\ApiResponses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponses;

    public function index(): JsonResponse
    {
        $products = Product::with('category')->orderBy('id')->paginate(10);

        return $this->ok('Products retrieved successfully', ProductResource::collection($products));
    }

    public function show(Product $product): JsonResponse
    {
        $product->load('category');

        return $this->ok('Product retrieved successfully', new ProductResource($product));
    }

    public function store(Request $request): JsonResponse
    {
        $product = Product::create($this->validateProduct($request));

        return $this->success('Product created successfully', new ProductResource($product), 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $product->update($this->validateProduct($request, partial: $request->isMethod('PATCH')));

        return $this->ok('Product updated successfully', new ProductResource($product));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return $this->ok('Product deleted successfully');
    }

    public function queries(): JsonResponse
    {
        $productsByCategory = Product::join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.name as category')
            ->groupBy('categories.id', 'categories.name');

        $queryResults = [
            'select_name_price' => Product::select('name', 'price')->get(),
            'with_category' => Product::with('category')->get(),
            'select_id_name_order_by_price' => Product::select('id', 'name')->orderBy('price')->get(),
            'limit_five' => Product::orderBy('id')->limit(5)->get(),

            'price_greater_than_or_equal_3' => Product::where('price', '>=', 3)->get(),
            'electronics' => Product::whereHas('category', function (Builder $category): void {
                $category->where('name', 'Electronics');
            })->get(),

            'sum_price' => Product::sum('price'),
            'avg_price' => Product::avg('price'),
            'max_price' => Product::max('price'),
            'min_price' => Product::min('price'),

            'total_price_per_category' => (clone $productsByCategory)
                ->selectRaw('SUM(products.price) as total_price')->get(),
            'average_price_per_category' => (clone $productsByCategory)
                ->selectRaw('AVG(products.price) as average_price')->get(),
            'minimum_price_per_category' => (clone $productsByCategory)
                ->selectRaw('MIN(products.price) as minimum_price')->get(),
            'average_price_ascending' => (clone $productsByCategory)
                ->selectRaw('AVG(products.price) as average_price')->orderBy('average_price')->get(),
            'electronics_and_books' => (clone $productsByCategory)
                ->whereIn('categories.name', ['Electronics', 'Books'])
                ->selectRaw('AVG(products.price) as average_price')->get(),
        ];

        return $this->success('Query results retrieved successfully', $queryResults);
    }

    public function stats(Request $request): JsonResponse
    {
        if ($request->boolean('dashboard')) {
            return $this->ok('Dashboard products retrieved successfully', [
                'products' => Product::with('category:id,name')->orderBy('id')
                    ->get(['id', 'name', 'category_id', 'price', 'created_at']),
            ]);
        }

        $inventory = Product1::toBase()
            ->selectRaw('COALESCE(SUM(quantity), 0) as total_units_in_stock')
            ->selectRaw('COALESCE(SUM(price * quantity), 0) as inventory_value')
            ->selectRaw('COUNT(CASE WHEN quantity <= ? THEN 1 END) as low_stock_count', [5])
            ->first();

        return $this->ok('Product statistics retrieved successfully', [
            'total_products' => Product::count(),
            'total_units_in_stock' => (int) $inventory->total_units_in_stock,
            'inventory_value' => (float) $inventory->inventory_value,
            'low_stock_count' => (int) $inventory->low_stock_count,
            'recent_products' => Product::latest()->orderByDesc('id')->limit(5)
                ->get(['id', 'name', 'price', 'created_at']),
        ]);
    }

    /**
     * @return array{category_id?: int, name?: string, description?: string|null, price?: numeric}
     */
    private function validateProduct(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes|required' : 'required';

        return $request->validate([
            'category_id' => $required.'|integer|exists:categories,id',
            'name' => $required.'|string|max:255',
            'description' => 'nullable|string|max:255',
            'price' => $required.'|numeric|min:0|max:99999999.99|decimal:0,2',
        ]);
    }
}
