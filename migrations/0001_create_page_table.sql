-- CreateTable
CREATE TABLE "Page" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "text" TEXT,
    "date" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_id_key" ON "Page"("id");
