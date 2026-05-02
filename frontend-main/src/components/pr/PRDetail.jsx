import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";
import "./pr.css";

const PRDetail = () => {
  const { prId } = useParams();
  const { currentUser } = useAuth();
  const [pr, setPr] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewBody, setReviewBody] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const [prRes, commentsRes] = await Promise.all([
          api.get(`/pr/${prId}`),
          api.get(`/comment/pr/${prId}`),
        ]);
        setPr(prRes.data);
        setComments(commentsRes.data.comments || []);
      } catch {
        toast.error("Failed to load pull request.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [prId]);

  const handleMerge = async () => {
    try {
      const res = await api.post(`/pr/${prId}/merge`);
      setPr(res.data);
      toast.success("Pull request merged!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to merge.");
    }
  };

  const handleClose = async () => {
    try {
      const res = await api.put(`/pr/update/${prId}`, { status: "closed" });
      setPr(res.data);
      toast.success("Pull request closed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to close.");
    }
  };

  const handleReopen = async () => {
    try {
      const res = await api.put(`/pr/update/${prId}`, { status: "open" });
      setPr(res.data);
      toast.success("Pull request reopened.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reopen.");
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post("/comment/create", {
        body: newComment,
        pullRequest: prId,
      });
      setComments([...comments, res.data]);
      setNewComment("");
      toast.success("Comment added.");
    } catch {
      toast.error("Failed to add comment.");
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/pr/${prId}/review`, { status: reviewStatus, body: reviewBody });
      const prRes = await api.get(`/pr/${prId}`);
      setPr(prRes.data);
      setReviewBody("");
      toast.success("Review submitted!");
    } catch {
      toast.error("Failed to submit review.");
    }
  };

  if (loading) return <div className="pr-loading">Loading...</div>;
  if (!pr) return <div className="pr-empty">Pull request not found.</div>;

  const isOwnerOrAuthor =
    currentUser === pr.author?._id ||
    currentUser === pr.repository?.owner?._id ||
    currentUser === pr.repository?.owner;

  return (
    <div className="pr-detail-page">
      <div className="pr-detail-header">
        <Link to={`/repo/${pr.repository?._id || pr.repository}`} className="pr-back-link">
          Back to repository
        </Link>
        <h1 className="pr-detail-title">
          {pr.title}
          <span className={`pr-status-badge ${pr.status}`} style={{ marginLeft: 12 }}>
            {pr.status}
          </span>
        </h1>
        <div className="pr-detail-meta">
          <span className="pr-branch-info">{pr.sourceBranch} → {pr.targetBranch}</span>
          <span> opened by <strong>{pr.author?.username}</strong> on {new Date(pr.createdAt).toLocaleDateString()}</span>
          {pr.mergedBy && (
            <span> merged by <strong>{pr.mergedBy.username}</strong> on {new Date(pr.mergedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {pr.description && (
        <div className="pr-detail-body">
          <p>{pr.description}</p>
        </div>
      )}

      {/* Actions */}
      {isOwnerOrAuthor && pr.status === "open" && (
        <div className="pr-actions">
          <button className="btn-merge" onClick={handleMerge}>Merge Pull Request</button>
          <button className="btn-close-pr" onClick={handleClose}>Close</button>
        </div>
      )}
      {isOwnerOrAuthor && pr.status === "closed" && (
        <div className="pr-actions">
          <button className="btn-reopen" onClick={handleReopen}>Reopen</button>
        </div>
      )}

      {/* Reviews */}
      {pr.reviews?.length > 0 && (
        <div className="pr-reviews-section">
          <h3>Reviews</h3>
          {pr.reviews.map((review, i) => (
            <div key={i} className={`review-item review-${review.status}`}>
              <div className="review-header">
                <strong>{review.reviewer?.username}</strong>
                <span className={`review-status ${review.status}`}>
                  {review.status === "approved" ? "Approved" : review.status === "changes_requested" ? "Changes Requested" : "Commented"}
                </span>
              </div>
              {review.body && <p className="review-body">{review.body}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Submit Review */}
      {pr.status === "open" && (
        <form onSubmit={handleReview} className="review-form">
          <h3>Submit Review</h3>
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            placeholder="Leave a review comment..."
            rows={3}
          />
          <div className="review-form-actions">
            <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
              <option value="approved">Approve</option>
              <option value="changes_requested">Request Changes</option>
              <option value="commented">Comment</option>
            </select>
            <button type="submit" className="btn-submit-review">Submit Review</button>
          </div>
        </form>
      )}

      {/* Comments */}
      <div className="pr-comments-section">
        <h3>Comments ({comments.length})</h3>
        {comments.map((c) => (
          <div key={c._id} className="comment-item">
            <div className="comment-header">
              <strong>{c.author?.username}</strong>
              <span className="comment-date">{new Date(c.createdAt).toLocaleDateString()}</span>
              {c.edited && <span className="comment-edited">(edited)</span>}
            </div>
            <p className="comment-body">{c.body}</p>
          </div>
        ))}

        <form onSubmit={handleComment} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
          />
          <button type="submit" className="btn-comment">Comment</button>
        </form>
      </div>
    </div>
  );
};

export default PRDetail;
