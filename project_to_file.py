import os
import argparse
import logging
import concurrent.futures
import re
from pathlib import Path


def is_text_file(file_path):
    """
    Проверяет, является ли файл текстовым.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            f.read(1024)
        return True
    except (UnicodeDecodeError, OSError):
        return False


def process_file(file_path, output_file):
    """
    Обрабатывает отдельный файл: читает содержимое и записывает в выходной файл.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as source_file:
            content = source_file.read()
        with open(output_file, "a", encoding="utf-8") as f:
            f.write(f"# {file_path}\n")
            f.write(content + "\n\n")
        logging.info(f"Включен файл: {file_path}")
    except Exception as e:
        logging.error(f"Ошибка при обработке файла {file_path}: {e}")


def write_folder_structure(project_dir, output_file, exclude_dirs_pattern):
    """
    Записывает структуру папок проекта в выходной файл, исключая содержимое определённых директорий.
    """
    folder_structure = ""
    for root, dirs, files in os.walk(project_dir):
        # Отображение уровня вложенности
        level = Path(root).relative_to(project_dir).parts
        indent = "    " * len(level)
        folder_name = os.path.basename(root) if os.path.basename(root) else "/"
        folder_structure += f"{indent}{folder_name}/\n"

        # Фильтрация директорий для исключения содержимого
        filtered_dirs = [d for d in dirs if not re.match(exclude_dirs_pattern, d)]
        for d in filtered_dirs:
            dirs.remove(d)  # Не обходим содержимое этих директорий

        # Если директория совпадает с исключёнными, не показываем её содержимое
        if re.match(exclude_dirs_pattern, os.path.basename(root)):
            continue

        # Добавление файлов
        for file in files:
            folder_structure += f"{indent}    {file}\n"

    # Запись структуры папок в файл
    with open(output_file, "a", encoding="utf-8") as f:
        f.write("\n# Структура папок проекта\n")
        f.write(folder_structure)


def main():
    parser = argparse.ArgumentParser(
        description="Скрипт для записи содержимого проекта в файл с улучшениями."
    )
    parser.add_argument("project_dir", help="Путь к корневой директории проекта.")
    parser.add_argument("output_file", help="Путь к выходному файлу.")
    parser.add_argument(
        "--exclude_files",
        nargs="*",
        default=[
            "__init__.py",
            "apps.py",
            "tests.py",
            "manage.py",
            "asgi.py",
            "wsgi.py",
            "project_to_file.py",
            "admin.py",
        ],
        help="Список файлов для исключения.",
    )
    parser.add_argument(
        "--include_extensions",
        nargs="*",
        default=[
            ".html",
            ".conf",
            ".conf.template",
            ".env",
            ".env.sample",
            ".ini",
            ".sh",
            ".yml",
            "Dockerfile",
            ".py",
        ],
        help="Список расширений файлов для включения.",
    )
    parser.add_argument(
        "--exclude_dirs",
        nargs="*",
        default=["migrations", "static", "__pycache__", "rest_framework", "drf-yasg"],
        help="Список директорий для исключения.",
    )
    parser.add_argument(
        "--max_workers",
        type=int,
        default=4,
        help="Количество потоков для параллельной обработки.",
    )
    args = parser.parse_args()

    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("project_to_file.log", encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )

    # Компиляция регулярного выражения для исключения директорий
    exclude_dirs_pattern = "|".join(args.exclude_dirs)

    # Очистка или создание выходного файла
    with open(args.output_file, "w", encoding="utf-8") as f:
        f.write(f"# Содержимое проекта {args.project_dir}\n\n")

    # Список файлов для обработки
    files_to_process = []

    for root, dirs, files in os.walk(args.project_dir):
        # Исключаем указанные директории
        dirs[:] = [d for d in dirs if d not in args.exclude_dirs]

        for file in files:
            file_path = os.path.join(root, file)

            # Исключаем определённые файлы
            if file in args.exclude_files:
                logging.info(f"Исключён файл: {file_path}")
                continue

            # Проверяем расширение файла
            if not any(file.endswith(ext) for ext in args.include_extensions):
                logging.info(f"Исключён файл по расширению: {file_path}")
                continue

            # Обработка специальных случаев
            if file.endswith(".html") and "templates" not in root:
                logging.info(f"Исключён HTML-файл не из 'templates': {file_path}")
                continue

            # Проверка, является ли файл текстовым
            if not is_text_file(file_path):
                logging.info(f"Исключён бинарный файл: {file_path}")
                continue

            # Добавляем файл для обработки
            files_to_process.append(file_path)

    # Параллельная обработка файлов
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=args.max_workers
    ) as executor:
        futures = [
            executor.submit(process_file, file_path, args.output_file)
            for file_path in files_to_process
        ]
        for future in concurrent.futures.as_completed(futures):
            if future.exception() is not None:
                logging.error(f"Ошибка в потоке: {future.exception()}")

    # Запись структуры папок
    write_folder_structure(args.project_dir, args.output_file, exclude_dirs_pattern)

    logging.info(
        f"Код проекта записан в файл {args.output_file}, структура папок добавлена."
    )


if __name__ == "__main__":
    main()
