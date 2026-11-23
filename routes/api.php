<?php

use App\Http\Controllers\HumanResourcesPayrollController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\Product1Controller;
use App\Http\Controllers\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::apiResource('products1', Product1Controller::class);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/payroll', [HumanResourcesPayrollController::class, 'payroll']);

Route::post('/payroll/calculate', [
    PayrollController::class,
    'calculate',
]);

Route::name('legacy.')->group(function () {
    Route::apiResource('products', ProductController::class);
});
