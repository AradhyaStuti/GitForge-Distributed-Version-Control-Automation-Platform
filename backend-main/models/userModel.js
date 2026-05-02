const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 39,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    repositories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Repository",
      },
    ],
    followedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    starRepos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Repository",
      },
    ],
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for common queries (email covered by unique: true)
UserSchema.index({ username: "text", email: "text" });

const User = mongoose.model("User", UserSchema);

module.exports = User;
