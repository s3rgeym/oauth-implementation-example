'use strict'

// Хак: babel перемещает импорты в начало модуля, но мне нужно чтобы до
// импорта моделей загрузились переменные окружения в которых хранятся настройки
// от базы данных
import dotenv from 'dotenv'
// import path from 'path'

// dotenv.config({
//   path: path.join(__dirname, '..', '.env')
// })
dotenv.config()
