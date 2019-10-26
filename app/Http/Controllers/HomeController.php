<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Auth;
use DB;
use App\Common;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    public function index()
    {
        $name = Auth::user()->name . '_'.Auth::user()->id;

        if( ! DB::table('chat')->where('id_owner', Auth::user()->id)->first() ) {
            DB::table('chat')->insert([
                'name' => $name,
                'id_owner' => Auth::user()->id
            ]);

        }

        return view('home')->with('room_name', $name );
    }

    /** AJAX SZUKAJ POKOJÓW
     * @param Request $request
     */
    public function startListening(Request $request){
        header('Content-Type: application/json');
        $roomName = $request->input('room_name');
        $url = "https://api2.scaledrone.com/" . config('constants.CHANNEL_ID'). "/rooms";
     //   var_dump($url);
        $options = array(
            'http' => array(
                'header' => "Content-type: application/json\r\n",
                'method' => 'GET'
            )
        );

        $context = stream_context_create($options);
        $result = file_get_contents($url, false, $context);

        $room = null;
        if ($result === FALSE) { /* Handle error */
            echo json_encode([
                'success' => 'FALSE'
            ]);
        }
        else{
            $result = json_decode($result);
            foreach( $result as $row ){
                if($row != $roomName){
                    $room = $row;
                    break;
                }
            }
        }


        echo json_encode([
            'success' => 'OK',
            'room_name' => $room
        ]);
    }
}
