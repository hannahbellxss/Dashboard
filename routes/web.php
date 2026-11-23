<?php

use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::view('/dashboard', 'product-dashboard')->name('products.dashboard');

Route::get('/local-variable', [PostController::class, 'index']);
Route::get('/read', [PostController::class, 'read']);
Route::get('/greet/{name}', [PostController::class, 'greet']);
