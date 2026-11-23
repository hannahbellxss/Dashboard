<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderProduct;
use App\Models\Product;
use App\Models\Product1;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::factory(5)->create();

        
        $products = Product::factory(2000)
            ->recycle($categories)
            ->create();

        
        $users = User::factory(20)->create();

     
        foreach ($users as $user) {
            Address::factory(rand(1, 2))
                ->for($user)
                ->create();
        }

        
        foreach ($users as $user) {
            $orders = Order::factory(rand(0, 5))
                ->for($user)
                ->create();

          
            foreach ($orders as $order) {
                $orderProducts = $products->random(rand(1, 4));

                foreach ($orderProducts as $product) {
                    OrderProduct::factory()
                        ->for($order)
                        ->for($product)
                        ->create();
                }
            }
        }

 
        foreach ($products as $product) {
            $reviewUsers = $users->random(rand(0, 8));

            foreach ($reviewUsers as $user) {
                Review::factory()
                    ->for($user)
                    ->for($product)
                    ->create();
            }
        }

        
        Product1::factory()->count(3)->create();
    }
}
