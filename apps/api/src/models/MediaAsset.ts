import { Schema, model, type InferSchemaType } from 'mongoose';

const mediaAssetSchema = new Schema(
	{
		fileName: { type: String, required: true },
		mimeType: { type: String, required: true },
		sizeBytes: { type: Number, required: true },
		storageType: { type: String, enum: ['buffer', 'base64'], default: 'buffer' },
		data: { type: Buffer, required: true },
		checksum: { type: String, required: true },
		context: { type: String, default: 'assignment-upload' },
	},
	{ timestamps: true },
);

export type MediaAssetDocument = InferSchemaType<typeof mediaAssetSchema>;

export const MediaAssetModel = model('MediaAsset', mediaAssetSchema);