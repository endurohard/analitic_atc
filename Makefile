.PHONY: help build up down restart logs clean init-db

help: ## Показать эту справку
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Собрать Docker образы
	docker-compose build

up: ## Запустить все сервисы
	docker-compose up -d
	@echo "✓ Приложение запущено!"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

down: ## Остановить все сервисы
	docker-compose down

restart: down up ## Перезапустить все сервисы

logs: ## Показать логи
	docker-compose logs -f

logs-backend: ## Показать логи backend
	docker-compose logs -f backend

logs-frontend: ## Показать логи frontend
	docker-compose logs -f frontend

clean: ## Остановить и удалить все (включая volumes)
	docker-compose down -v
	@echo "✓ Все удалено"

init-db: ## Инициализировать базу данных (создать таблицы и тестовые данные)
	docker-compose exec backend python init_db.py

setup: ## Полная установка (база данных + таблицы + организации)
	@cd scripts && python setup.py

manage-orgs: ## Управление организациями
	@cd scripts && python manage_organizations.py

shell-backend: ## Открыть shell в backend контейнере
	docker-compose exec backend /bin/sh

shell-frontend: ## Открыть shell в frontend контейнере
	docker-compose exec frontend /bin/sh

ps: ## Показать запущенные контейнеры
	docker-compose ps

change-password: ## Изменить пароль пользователя (использование: make change-password USER=admin PASS=newpass)
	@docker exec atc_analytics_backend python3 change_password.py $(USER) $(PASS)
