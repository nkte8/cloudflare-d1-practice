# 手順メモ

以下のチュートリアルを実施

https://developers.cloudflare.com/d1/tutorials/d1-and-prisma-orm/

## 環境

```
$ node -v
v22.16.0
$ npx wrangler -v

 ⛅️ wrangler 4.20.0
───────────────────
```

## 前準備

### wrangler login

デスクトップ環境にて、以下を実行
```
wrangler login
```
ブラウザが開き、ログイン後、ターミナルでログインに成功したログが出力される。

### Cloudflare workerのセットアップ

```sh
npm create cloudflare@latest . -- --type hello-world
```
以下の質問に回答
```log
Do you want to use git for version control? -> No
Do you want to deploy your application? -> Yes
```

以下が表示されたらCloudflare上にWorkerが作成される。
```
🎉  SUCCESS  Application deployed successfully!
```

### Prismaのインストール

```sh
npm i -D prisma
npm i @prisma/client @prisma/adapter-d1
npx prisma init --datasource-provider sqlite
```

cloudflare-dl-practice/prisma/schema.prismaへ、以下を追記
```diff
 generator client {
   provider = "prisma-client-js"
   output   = "../src/generated/prisma"
+  previewFeatures = ["driverAdapters"]
 }
```

## 構築

### D1へのデータベース作成

wranglerコマンドでデータベースの作成
```sh
npx wrangler d1 create cloudflare-d1-practice
```
ログより`d1_database`jsonフィールドが作成されるため、`wrangler.jsonc`へ追記
```diff
	"observability": {
		"enabled": true
-	}
+   },
+	"d1_databases": [
+		{
+			"binding": "DB",
+			"database_name": "cloudflare-d1-practice",
+			"database_id": "<データベースID>"
+		}
+	]
```

### 作成したデータベースへのテーブルの作成

初期状態のマイグレーションを作成する。名前はマイグレーション範囲（ここでは、`create_page_table`までの内容とする）で決める
```sh
npx wrangler d1 migrations create cloudflare-d1-practice create_page_table
```
マイグレーションの作成を要求されるため、`y`
以下のログにて完了
```
✅Successfully created Migration 'create_page_table.sql'!
```
`cloudflare-d1-practice/migrations/create_page_table.sql`が作成される。

`schema.prisma`へ追記しスキーマの作成
```prisma
model Page {
  id    Int     @id @default(autoincrement()) @unique
  title String
  text  String?
  date  DateTime
}
```

Prismaスキーマを受け、コマンドがSQLファイルに記載される。
```sh
npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/0001_create_page_table.sql
```

スキーマを作成後、prismaクライアントを生成する。typescriptからの操作に必要。
```sh
npx prisma generate
```

### ローカルワーカーでテスト

リモートで実施する場合は`--local`の代わりに`--remote`を設定

マイグレーションをデータベースに適応する（Warningはデータ適応中はアクセス出来ないことを示す。`y`を投下する）
```sh
npx wrangler d1 migrations apply cloudflare-d1-practice --local
```

SQLへデータを追加する
```sh
npx wrangler d1 execute cloudflare-d1-practice --command "INSERT INTO  \"Page\" (\"title\", \"text\", \"date\") VALUES ('タイトルテキスト', 'testtext', '$(date '+%Y-%m-%d %H:%M:%S')');" --local
```

クライアントの実行
```sh
npm run dev
```
以下のような出力により、Worker越しにDBを取得可能
```log
[wrangler:info] Ready on http://localhost:8787
```

### リモートワーカーへのデプロイ

すでに`--remote`での実行を実施している場合は不要

リモート環境向けにも同様の方法でDBを適応する。
```sh
npx wrangler d1 migrations apply cloudflare-d1-practice --remote
```

データの登録を実施（ローカルとは別途必要、データ登録のマイグレーションを作成すれば省略可能）

```sh
npx wrangler d1 execute cloudflare-d1-practice --command "INSERT INTO  \"Page\" (\"title\", \"text\", \"date\") VALUES ('タイトルテキスト', 'testtext', '$(date '+%Y-%m-%d %H:%M:%S')');" --remote
```

リモートへデプロイ
```sh
npm run deploy
```

## 運用

### データのエクスポート

INSERTで追加したデータをエクスポート可能

```sh
npx wrangler d1 export cloudflare-d1-practice --output=./backups/userdata.sql --local
```

### データベースのインポート

実施するにはデータベースは空である必要がある。
インポートを実行
```sh
npx wrangler d1 execute cloudflare-d1-practice --file=./backups/userdata.sql --local
```

### データベースの復元（オンラインのみ）

オンライン上で自動バックアップされており、特定タイムスタンプへ戻せる。
https://developers.cloudflare.com/d1/reference/time-travel/#restore-a-database


## 破棄

作成した場合、リモートワーカーを停止

```sh
npx wrangler delete
```

D1データベースも削除する場合（リモート/ローカル共に削除）

```sh
npx wrangler d1 delete  
```

ローカルのみ破棄する場合は、`.wrangler/d1/miniflare-D1DatabaseObject`配下のDatabaseIDのファイルを削除する

