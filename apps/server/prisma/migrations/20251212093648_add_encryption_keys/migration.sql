-- CreateTable
CREATE TABLE "user_identity_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "registration_id" INTEGER NOT NULL,
    "identity_key" BYTEA NOT NULL,
    "signed_pre_key_id" INTEGER NOT NULL,
    "signed_pre_key" BYTEA NOT NULL,
    "signed_pre_key_signature" BYTEA NOT NULL,
    "signed_pre_key_timestamp" TIMESTAMP(3) NOT NULL,
    "kyber_pre_key_id" INTEGER NOT NULL,
    "kyber_pre_key" BYTEA NOT NULL,
    "kyber_pre_key_signature" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_identity_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_keys" (
    "id" TEXT NOT NULL,
    "user_identity_id" TEXT NOT NULL,
    "key_id" INTEGER NOT NULL,
    "public_key" BYTEA NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_keys_user_id_key" ON "user_identity_keys"("user_id");

-- CreateIndex
CREATE INDEX "user_identity_keys_user_id_idx" ON "user_identity_keys"("user_id");

-- CreateIndex
CREATE INDEX "pre_keys_user_identity_id_used_idx" ON "pre_keys"("user_identity_id", "used");

-- CreateIndex
CREATE UNIQUE INDEX "pre_keys_user_identity_id_key_id_key" ON "pre_keys"("user_identity_id", "key_id");

-- AddForeignKey
ALTER TABLE "user_identity_keys" ADD CONSTRAINT "user_identity_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_keys" ADD CONSTRAINT "pre_keys_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
