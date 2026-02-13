- Rung lắc điện thoại, hoặc click vào cây để rung hoa, thời gian rung khoảng 3 - 6 giây liên tục sẽ lụm đc 1 bao lì xì ngẫu nhiên (có thể dùng chung asset bao lì xì E:\SourceCode\Tet-holiday\apps\frontend-react\public\assets\red-envelop )

- Mỗi một bao lì xì rớt ra sẽ bao gồm [Hiển thị một câu chúc tết ngẫu nhiên [text](../apps/frontend-react/public/assets/shake-tree/chuc-tet.json)] và một mệnh giá tiền ngẫu nhiên từ UI config khi vừa vào màn hình game

- Khi vừa vào màn hình, hiển thị HUD config mệnh giá lì xì và tỉ lệ xuất hiện của từng mệnh giá
Ví dụ
User nhập các rows input
Mệnh giá | Tỉ lệ
10k      | 30%

v.v... 
Phải đảm bảo tỉ lệ cộng lại là 100% nhé

- Khi user rung xong, hiển thị mệnh giá lì xì rớt ra và câu chúc tết random trong list json.

- Asset:
    - Hình 1: Full background gồm cây (E:\SourceCode\Tet-holiday\apps\frontend-react\public\assets\shake-tree\1.png)
    - Hình 2: Ảnh PNG của cái cây thôi (E:\SourceCode\Tet-holiday\apps\frontend-react\public\assets\shake-tree\2.png)

- Sau khi đã hiển thị mệnh giá lì xì rớt ra và câu chúc tết, cần hiển thị nút 'Chơi lại' để user có thể rung lại và lụm đc bao lì xì khác