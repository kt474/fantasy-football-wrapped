<script setup lang="ts"></script>
<template>
  <nav class="bg-blue-300 border-gray-200 rounded-b-xl dark:bg-gray-900">
    <div
      class="max-w-screen-2xl flex flex-wrap items-center justify-between mx-auto p-4"
    >
      <a class="flex items-center space-x-3 rtl:space-x-reverse">
        <img
          src="../assets/football-helmet.png"
          class="h-8"
          alt="Flowbite Logo"
        />
        <span
          class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white"
          >FF League Analyzer</span
        >
      </a>

      <div class="hidden w-full md:block md:w-auto" id="navbar-default">
        <div
          class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700"
        ></div>
      </div>
    </div>
  </nav>
</template>
